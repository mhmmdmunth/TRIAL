import { WorkItem, VesselSpec, ProjectSchedule } from '../types';

export interface PersistenceDiscrepancy {
  entityType: 'work_item' | 'opname_item' | 'vessel' | 'schedule';
  id?: string;
  field: string;
  memoryValue: any;
  databaseValue: any;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface PersistenceDiagnosticReport {
  timestamp: string;
  isHealthy: boolean;
  totalMemoryWorkItems: number;
  totalDbWorkItems: number;
  totalMemoryOpnameItems: number;
  totalDbOpnameItems: number;
  discrepancies: PersistenceDiscrepancy[];
  summary: string;
}

/**
 * Diagnostic utility function to verify data persistence by comparing memory state 
 * with the underlying SQLite database content and logging any discrepancies found.
 */
export function verifyDataPersistence(
  memoryState: {
    workItems: WorkItem[];
    vessel?: VesselSpec;
    schedule?: ProjectSchedule;
    opnameItems?: WorkItem[];
  },
  sqliteService: any
): PersistenceDiagnosticReport {
  const discrepancies: PersistenceDiscrepancy[] = [];
  const timestamp = new Date().toISOString();

  if (!sqliteService || !sqliteService.isReady()) {
    const report: PersistenceDiagnosticReport = {
      timestamp,
      isHealthy: false,
      totalMemoryWorkItems: memoryState.workItems?.length || 0,
      totalDbWorkItems: 0,
      totalMemoryOpnameItems: memoryState.opnameItems?.length || 0,
      totalDbOpnameItems: 0,
      discrepancies: [
        {
          entityType: 'work_item',
          field: 'database_status',
          memoryValue: 'ready',
          databaseValue: 'uninitialized',
          severity: 'critical',
          message: 'SQLite database is not initialized or not ready.',
        },
      ],
      summary: 'CRITICAL: SQLite database is uninitialized.',
    };
    console.error('🔍 [Persistence Diagnostic] Database uninitialized!', report);
    return report;
  }

  // 1. Fetch raw underlying SQLite items directly
  const dbWorkItems: WorkItem[] = sqliteService.getWorkItems() || [];
  const dbOpnameItems: WorkItem[] = sqliteService.getOpnameWorkItems() || [];
  const dbVessel: VesselSpec = sqliteService.getVessel();
  const dbSchedule: ProjectSchedule = sqliteService.getProjectSchedule();

  const memWorkItems = memoryState.workItems || [];
  const memOpnameItems = memoryState.opnameItems || [];

  // 2. Compare Work Item counts
  if (memWorkItems.length !== dbWorkItems.length) {
    discrepancies.push({
      entityType: 'work_item',
      field: 'count',
      memoryValue: memWorkItems.length,
      databaseValue: dbWorkItems.length,
      severity: 'critical',
      message: `Work item count mismatch! Memory has ${memWorkItems.length} items, DB has ${dbWorkItems.length} items.`,
    });
  }

  // 3. Compare individual Work Items
  const dbWorkItemMap = new Map<string, WorkItem>();
  dbWorkItems.forEach((item) => dbWorkItemMap.set(item.id, item));

  memWorkItems.forEach((memItem) => {
    const dbItem = dbWorkItemMap.get(memItem.id);
    if (!dbItem) {
      discrepancies.push({
        entityType: 'work_item',
        id: memItem.id,
        field: 'existence',
        memoryValue: true,
        databaseValue: false,
        severity: 'critical',
        message: `Item "${memItem.itemNo} ${memItem.description}" (ID: ${memItem.id}) exists in memory but is MISSING in SQLite DB!`,
      });
      return;
    }

    // Compare progressPercent
    if ((memItem.progressPercent || 0) !== (dbItem.progressPercent || 0)) {
      discrepancies.push({
        entityType: 'work_item',
        id: memItem.id,
        field: 'progressPercent',
        memoryValue: memItem.progressPercent || 0,
        databaseValue: dbItem.progressPercent || 0,
        severity: 'warning',
        message: `Item "${memItem.description}" (ID: ${memItem.id}) progressPercent mismatch: Memory = ${memItem.progressPercent || 0}%, DB = ${dbItem.progressPercent || 0}%`,
      });
    }

    // Compare isCompleted
    if (Boolean(memItem.isCompleted) !== Boolean(dbItem.isCompleted)) {
      discrepancies.push({
        entityType: 'work_item',
        id: memItem.id,
        field: 'isCompleted',
        memoryValue: Boolean(memItem.isCompleted),
        databaseValue: Boolean(dbItem.isCompleted),
        severity: 'warning',
        message: `Item "${memItem.description}" (ID: ${memItem.id}) isCompleted mismatch: Memory = ${memItem.isCompleted}, DB = ${dbItem.isCompleted}`,
      });
    }

    // Compare dailyLogs JSON
    const memDailyLogs = JSON.stringify(memItem.dailyLogs || {});
    const dbDailyLogs = JSON.stringify(dbItem.dailyLogs || {});
    if (memDailyLogs !== dbDailyLogs) {
      discrepancies.push({
        entityType: 'work_item',
        id: memItem.id,
        field: 'dailyLogs',
        memoryValue: memDailyLogs,
        databaseValue: dbDailyLogs,
        severity: 'critical',
        message: `Item "${memItem.description}" (ID: ${memItem.id}) dailyLogs JSON mismatch between memory and SQLite DB!`,
      });
    }

    // Compare planLogs JSON
    const memPlanLogs = JSON.stringify(memItem.planLogs || {});
    const dbPlanLogs = JSON.stringify(dbItem.planLogs || {});
    if (memPlanLogs !== dbPlanLogs) {
      discrepancies.push({
        entityType: 'work_item',
        id: memItem.id,
        field: 'planLogs',
        memoryValue: memPlanLogs,
        databaseValue: dbPlanLogs,
        severity: 'warning',
        message: `Item "${memItem.description}" (ID: ${memItem.id}) planLogs JSON mismatch between memory and SQLite DB!`,
      });
    }
  });

  // Check for items in DB missing in Memory
  const memWorkItemMap = new Map<string, WorkItem>();
  memWorkItems.forEach((item) => memWorkItemMap.set(item.id, item));

  dbWorkItems.forEach((dbItem) => {
    if (!memWorkItemMap.has(dbItem.id)) {
      discrepancies.push({
        entityType: 'work_item',
        id: dbItem.id,
        field: 'existence',
        memoryValue: false,
        databaseValue: true,
        severity: 'warning',
        message: `Item "${dbItem.itemNo} ${dbItem.description}" (ID: ${dbItem.id}) exists in SQLite DB but is MISSING in memory!`,
      });
    }
  });

  // 4. Compare Opname Work Items
  if (memOpnameItems.length > 0 && dbOpnameItems.length > 0) {
    if (memOpnameItems.length !== dbOpnameItems.length) {
      discrepancies.push({
        entityType: 'opname_item',
        field: 'count',
        memoryValue: memOpnameItems.length,
        databaseValue: dbOpnameItems.length,
        severity: 'info',
        message: `Opname item count mismatch: Memory = ${memOpnameItems.length}, DB = ${dbOpnameItems.length}`,
      });
    }
  }

  // 5. Compare Vessel Specs
  if (memoryState.vessel) {
    if (memoryState.vessel.name !== dbVessel.name) {
      discrepancies.push({
        entityType: 'vessel',
        field: 'name',
        memoryValue: memoryState.vessel.name,
        databaseValue: dbVessel.name,
        severity: 'warning',
        message: `Vessel name mismatch: Memory = "${memoryState.vessel.name}", DB = "${dbVessel.name}"`,
      });
    }
  }

  // 6. Generate Summary & Output Diagnostic Log
  const isHealthy = discrepancies.length === 0;
  const summary = isHealthy
    ? `✅ [Persistence Diagnostics] ALL HEALTHY! Memory state matches SQLite DB perfectly (${memWorkItems.length} work items, ${memOpnameItems.length} opname items).`
    : `⚠️ [Persistence Diagnostics] FOUND ${discrepancies.length} DISCREPANCY(IES) between memory state and SQLite DB!`;

  const report: PersistenceDiagnosticReport = {
    timestamp,
    isHealthy,
    totalMemoryWorkItems: memWorkItems.length,
    totalDbWorkItems: dbWorkItems.length,
    totalMemoryOpnameItems: memOpnameItems.length,
    totalDbOpnameItems: dbOpnameItems.length,
    discrepancies,
    summary,
  };

  if (isHealthy) {
    console.log(summary, report);
  } else {
    console.warn(summary, report);
    discrepancies.forEach((d, idx) => {
      console.warn(`  [${idx + 1}/${discrepancies.length}] [${d.severity.toUpperCase()}] ${d.message}`);
    });
  }

  return report;
}
