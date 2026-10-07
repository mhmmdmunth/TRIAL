import {
  ShipyardProject,
  VesselSpec,
  ProjectSchedule,
  WorkCategory,
  WorkItem,
  DefectSurvey,
  Signatures,
} from '../types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SIGNATURES,
} from '../data/shipyardSeedData';
import {
  TUGBOAT_TEMPLATE,
  BARGE_TEMPLATE,
  TANKER_TEMPLATE,
} from '../data/shipyardTemplates';

const PROJECTS_STORAGE_KEY = 'shipyard_multi_projects_v1';
const ACTIVE_PROJECT_ID_KEY = 'shipyard_active_project_id_v1';

export const INITIAL_SHIPYARD_PROJECTS: ShipyardProject[] = [
  {
    id: 'proj-f049',
    vessel: { ...TUGBOAT_TEMPLATE.vessel },
    schedule: { ...TUGBOAT_TEMPLATE.schedule },
    categories: [...DEFAULT_CATEGORIES],
    workItems: [],
    defectSurveys: [...TUGBOAT_TEMPLATE.defectSurveys],
    signatures: { ...TUGBOAT_TEMPLATE.signatures },
    status: 'In Progress',
    lastModified: new Date().toISOString(),
    createdAt: '2026-09-01T08:00:00.000Z',
    totalItemsCount: 0,
    progressPercent: 0,
    estimatedCost: 0,
  },
  {
    id: 'proj-bg300',
    vessel: { ...BARGE_TEMPLATE.vessel },
    schedule: { ...BARGE_TEMPLATE.schedule },
    categories: [...DEFAULT_CATEGORIES],
    workItems: [],
    defectSurveys: [...BARGE_TEMPLATE.defectSurveys],
    signatures: { ...BARGE_TEMPLATE.signatures },
    status: 'Under Docking',
    lastModified: new Date(Date.now() - 3600000 * 5).toISOString(),
    createdAt: '2026-08-25T08:00:00.000Z',
    totalItemsCount: 0,
    progressPercent: 0,
    estimatedCost: 0,
  },
  {
    id: 'proj-mtborneo',
    vessel: { ...TANKER_TEMPLATE.vessel },
    schedule: { ...TANKER_TEMPLATE.schedule },
    categories: [...DEFAULT_CATEGORIES],
    workItems: [],
    defectSurveys: [...TANKER_TEMPLATE.defectSurveys],
    signatures: { ...TANKER_TEMPLATE.signatures },
    status: 'Preparation',
    lastModified: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: '2026-09-05T09:00:00.000Z',
    totalItemsCount: 0,
    progressPercent: 0,
    estimatedCost: 0,
  },
];

class ProjectService {
  private projects: ShipyardProject[] = [];
  private activeProjectId: string = 'proj-f049';
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (savedProjects) {
        this.projects = JSON.parse(savedProjects);
        // Ensure every project contains all DEFAULT_CATEGORIES (including Category XII. Others)
        let modified = false;
        this.projects.forEach((p) => {
          if (Array.isArray(p.categories)) {
            DEFAULT_CATEGORIES.forEach((defCat) => {
              if (!p.categories.some((c) => c.id === defCat.id || c.code === defCat.code)) {
                p.categories.push({ ...defCat });
                modified = true;
              }
            });
            p.categories.sort((a, b) => a.sortOrder - b.sortOrder);
          } else {
            p.categories = [...DEFAULT_CATEGORIES];
            modified = true;
          }
        });

        // Ensure all categories in repair list are emptied as requested
        const clearedKey = 'shipyard_work_items_cleared_v1';
        if (!localStorage.getItem(clearedKey)) {
          this.projects.forEach((p) => {
            p.workItems = [];
            p.totalItemsCount = 0;
            p.progressPercent = 0;
            p.estimatedCost = 0;
          });
          modified = true;
          localStorage.setItem(clearedKey, 'true');
        }

        if (modified) {
          this.saveToStorage();
        }
      } else {
        this.projects = [...INITIAL_SHIPYARD_PROJECTS];
        this.saveToStorage();
      }

      const activeId = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
      if (activeId && this.projects.some((p) => p.id === activeId)) {
        this.activeProjectId = activeId;
      } else if (this.projects.length > 0 && this.projects[0]) {
        this.activeProjectId = this.projects[0].id;
      }
    } catch (e) {
      console.warn('Error loading projects from storage', e);
      this.projects = [...INITIAL_SHIPYARD_PROJECTS];
      this.activeProjectId = this.projects[0]?.id || 'proj-f049';
    }
  }

  private sanitizeProjects(
    projects: ShipyardProject[],
    options: { stripImages?: boolean } = {}
  ): ShipyardProject[] {
    return projects.map((p) => {
      const cleanVessel = { ...p.vessel };
      if (options.stripImages && cleanVessel.photoUrl && cleanVessel.photoUrl.startsWith('data:image/')) {
        cleanVessel.photoUrl = '';
      }

      const cleanDefects = (p.defectSurveys || []).map((d) => {
        const cleanD = { ...d };
        if (options.stripImages && cleanD.photoUrl && cleanD.photoUrl.startsWith('data:image/')) {
          cleanD.photoUrl = '';
        }
        return cleanD;
      });

      return {
        ...p,
        vessel: cleanVessel,
        defectSurveys: cleanDefects,
      };
    });
  }

  private saveToStorage() {
    try {
      // 1. Always attempt saving active project ID
      try {
        localStorage.setItem(ACTIVE_PROJECT_ID_KEY, this.activeProjectId);
      } catch (errKey) {
        console.warn('Could not save active project ID', errKey);
      }

      // 2. Primary attempt: Save full projects array
      const rawJson = JSON.stringify(this.projects);
      localStorage.setItem(PROJECTS_STORAGE_KEY, rawJson);
    } catch (e: any) {
      console.warn('Standard saveToStorage hit quota or error, running storage optimization:', e);

      // Level 2: Strip large Base64 data URLs from images
      try {
        const sanitized = this.sanitizeProjects(this.projects, { stripImages: true });
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(sanitized));
        console.info('Projects saved successfully after trimming heavy embedded image data.');
        return;
      } catch (err2) {
        console.warn('Level 2 saveToStorage failed, attempting non-active project pruning:', err2);
      }

      // Level 3: Prune heavy work lists from non-active projects to reclaim quota, keeping active project untouched.
      // NEVER delete 'shipyard_sqlite_bin_v1' as it is the user's critical active database.
      try {
        const prunedProjects = this.projects.map((p) => {
          if (p.id === this.activeProjectId) {
            return p; // Keep full active project
          }
          // Trim heavy lists from inactive projects to fit into 5MB localStorage limit
          return {
            ...p,
            workItems: [],
            defectSurveys: [],
            lastModified: p.lastModified,
          };
        });

        const sanitized = this.sanitizeProjects(prunedProjects, { stripImages: true });
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(sanitized));
        console.info('Projects saved successfully after pruning non-active projects heavy lists.');
        return;
      } catch (err3) {
        console.warn('Level 3 saveToStorage failed, attempting sessionStorage fallback:', err3);
      }

      // Level 4: Fallback to sessionStorage to keep active session data intact without crashing
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(this.projects));
        }
      } catch (err4) {
        console.error('All storage save attempts failed:', err4);
      }
    }
  }

  public getAllProjects(): ShipyardProject[] {
    return [...this.projects];
  }

  public getProjectById(id: string): ShipyardProject | null {
    return this.projects.find((p) => p.id === id) || null;
  }

  public getActiveProject(): ShipyardProject {
    let p = this.projects.find((proj) => proj.id === this.activeProjectId);
    if (!p) {
      if (this.projects.length > 0 && this.projects[0]) {
        p = this.projects[0];
        this.activeProjectId = p.id;
      } else if (INITIAL_SHIPYARD_PROJECTS.length > 0) {
        p = INITIAL_SHIPYARD_PROJECTS[0];
        this.projects = [p];
        this.activeProjectId = p.id;
      }
      this.saveToStorage();
    }
    return p;
  }

  public setActiveProjectId(id: string): void {
    if (this.projects.some((p) => p.id === id)) {
      this.activeProjectId = id;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public createProject(
    vesselData: Partial<VesselSpec>,
    scheduleData?: Partial<ProjectSchedule>,
    overrideTemplateType?: 'tug' | 'barge' | 'tanker'
  ): ShipyardProject {
    const newId = `proj-${Date.now().toString(36)}`;
    const vesselId = `vessel-${Date.now().toString(36)}`;

    // Determine matching template
    let template = TUGBOAT_TEMPLATE;
    const typeLower = (vesselData.vesselType || overrideTemplateType || '').toLowerCase();
    if (overrideTemplateType === 'barge' || typeLower.includes('barge') || typeLower.includes('tongkang')) {
      template = BARGE_TEMPLATE;
    } else if (overrideTemplateType === 'tanker' || typeLower.includes('tanker') || typeLower.includes('spob')) {
      template = TANKER_TEMPLATE;
    } else if (overrideTemplateType === 'tug' || typeLower.includes('tug')) {
      template = TUGBOAT_TEMPLATE;
    }

    const vessel: VesselSpec = {
      id: vesselId,
      name: vesselData.name || template.vessel.name,
      dimension: vesselData.dimension || template.vessel.dimension,
      vesselType: vesselData.vesselType || template.vessel.vesselType,
      dockingType: vesselData.dockingType || template.vessel.dockingType,
      companyOwner: vesselData.companyOwner || template.vessel.companyOwner,
      projectNo: vesselData.projectNo || `F-0${Math.floor(50 + Math.random() * 40)}`,
      classification: vesselData.classification || template.vessel.classification,
      kindOfSurvey: vesselData.kindOfSurvey || template.vessel.kindOfSurvey,
      photoUrl: vesselData.photoUrl || template.vessel.photoUrl,
    };

    const schedule: ProjectSchedule = {
      id: newId,
      vesselId: vesselId,
      arriveBgn: scheduleData?.arriveBgn || template.schedule.arriveBgn,
      startContract: scheduleData?.startContract || template.schedule.startContract,
      arrivalMeeting: scheduleData?.arrivalMeeting || template.schedule.arrivalMeeting,
      dockingDate: scheduleData?.dockingDate || template.schedule.dockingDate,
      undockingDate: scheduleData?.undockingDate || template.schedule.undockingDate,
      finishWork: scheduleData?.finishWork || template.schedule.finishWork,
      sailOut: scheduleData?.sailOut || template.schedule.sailOut,
      dockingPosition: scheduleData?.dockingPosition || template.schedule.dockingPosition,
      dockingDurationDays: scheduleData?.dockingDurationDays || template.schedule.dockingDurationDays,
      status: scheduleData?.status || template.schedule.status,
    };

    // Deep copy template work items & assign new IDs
    const seedItems = template.workItems.map((w, idx) => ({
      ...w,
      id: `wi-${newId}-${idx + 1}`,
      projectId: newId,
      progressPercent: 0,
      progressQty: 0,
    }));

    // Deep copy template defect surveys & assign new IDs
    const seedDefects = template.defectSurveys.map((d, idx) => ({
      ...d,
      id: `ds-${newId}-${idx + 1}`,
      projectId: newId,
    }));

    const newProject: ShipyardProject = {
      id: newId,
      vessel,
      schedule,
      categories: [...DEFAULT_CATEGORIES],
      workItems: seedItems,
      defectSurveys: seedDefects,
      signatures: { ...template.signatures },
      status: schedule.status,
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      totalItemsCount: seedItems.length,
      progressPercent: 0,
      estimatedCost: seedItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
    };

    this.projects.unshift(newProject);
    this.activeProjectId = newId;
    this.saveToStorage();
    this.notifyListeners();
    return newProject;
  }

  public updateProjectData(
    id: string,
    data: {
      vessel?: VesselSpec;
      schedule?: ProjectSchedule;
      categories?: WorkCategory[];
      workItems?: WorkItem[];
      opnameItems?: WorkItem[];
      defectSurveys?: DefectSurvey[];
      signatures?: Signatures;
    }
  ): void {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const p = this.projects[idx];
      const updatedWorkItems = data.workItems || p.workItems;
      const totalItems = updatedWorkItems.length;

      let progressAvg = 0;
      if (totalItems > 0) {
        const sumProg = updatedWorkItems.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0);
        progressAvg = Number((sumProg / totalItems).toFixed(1));
      }

      const totalCost = updatedWorkItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

      const updatedProjects = [...this.projects];
      updatedProjects[idx] = {
        ...p,
        vessel: data.vessel || p.vessel,
        schedule: data.schedule || p.schedule,
        categories: data.categories || p.categories,
        workItems: updatedWorkItems,
        opnameItems: data.opnameItems || p.opnameItems,
        defectSurveys: data.defectSurveys || p.defectSurveys,
        signatures: data.signatures || p.signatures,
        status: data.schedule?.status || p.status,
        lastModified: new Date().toISOString(),
        totalItemsCount: totalItems,
        progressPercent: progressAvg,
        estimatedCost: totalCost,
      };
      this.projects = updatedProjects;

      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public deleteProject(id: string): boolean {
    if (this.projects.length <= 1) {
      return false; // Minimum 1 project required
    }
    this.projects = this.projects.filter((p) => p.id !== id);
    if (this.activeProjectId === id) {
      this.activeProjectId = this.projects[0].id;
    }
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  public duplicateProject(id: string): ShipyardProject | null {
    const source = this.getProjectById(id);
    if (!source) return null;

    const newId = `proj-copy-${Date.now().toString(36)}`;
    const newVesselId = `vessel-${Date.now().toString(36)}`;

    const duplicated: ShipyardProject = {
      ...source,
      id: newId,
      vessel: {
        ...source.vessel,
        id: newVesselId,
        name: `${source.vessel.name} (SALINAN)`,
        projectNo: `${source.vessel.projectNo}-COPY`,
      },
      schedule: {
        ...source.schedule,
        id: newId,
        vesselId: newVesselId,
        status: 'Preparation',
      },
      workItems: source.workItems.map((w, idx) => ({
        ...w,
        id: `wi-${newId}-${idx + 1}`,
        projectId: newId,
        progressPercent: 0,
        progressQty: 0,
      })),
      defectSurveys: [],
      status: 'Preparation',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      progressPercent: 0,
    };

    this.projects.unshift(duplicated);
    this.saveToStorage();
    this.notifyListeners();
    return duplicated;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb());
  }
}

export const projectService = new ProjectService();
