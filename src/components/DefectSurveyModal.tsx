import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Scale,
  Save,
  Layers,
  Info,
  Sparkles,
  Mic,
  MicOff,
  Wand2,
  StickyNote,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  BookOpen,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { DefectSurvey, MaterialCategory, SteelPlateGrade, STEEL_PLATE_GRADES } from '../types';
import {
  TonnageCalculator,
  STANDARD_PIPES,
  STANDARD_HBEAMS,
  STANDARD_ANGLES,
  STANDARD_FLATBARS,
  STANDARD_ROUNDBARS,
  STANDARD_SQUAREBARS,
  STANDARD_GRATINGS,
  STANDARD_BORDES,
  STANDARD_CHANNELS,
} from '../utils/tonnageCalculator';

interface DefectSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (survey: Omit<DefectSurvey, 'id' | 'createdAt'>, editId?: string) => void;
  initialSurvey?: DefectSurvey | null;
  projectId: string;
}

export const DefectSurveyModal: React.FC<DefectSurveyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSurvey,
  projectId,
}) => {
  const [zone, setZone] = useState('');
  const [desc, setDesc] = useState('');
  const [materialCat, setMaterialCat] = useState<MaterialCategory>('plate');
  const [remedyAction, setRemedyAction] = useState('Crop & Replating');
  const [error, setError] = useState('');

  // --- Dimension States ---
  // Plate states (3 Opsi: ABS, BKI, NC)
  const [plateLengthStr, setPlateLengthStr] = useState('1.5');
  const [plateWidthStr, setPlateWidthStr] = useState('1.0');
  const [plateThickStr, setPlateThickStr] = useState('10');
  const [plateGrade, setPlateGrade] = useState<SteelPlateGrade>('BKI');

  // Pipe states
  const [pipeNps, setPipeNps] = useState('2"');
  const [pipeSch, setPipeSch] = useState('Sch 40');
  const [pipeLengthStr, setPipeLengthStr] = useState('6.0');
  const [pipeQtyStr, setPipeQtyStr] = useState('1');
  const [isCustomPipe, setIsCustomPipe] = useState(false);
  const [customOdStr, setCustomOdStr] = useState('60.3');
  const [customWtStr, setCustomWtStr] = useState('3.91');

  // H-Beam states
  const [hbeamIdx, setHbeamIdx] = useState(2);
  const [hbeamLengthStr, setHbeamLengthStr] = useState('6.0');
  const [hbeamQtyStr, setHbeamQtyStr] = useState('1');

  // Angle Bar states
  const [angleIdx, setAngleIdx] = useState(3);
  const [angleLengthStr, setAngleLengthStr] = useState('6.0');
  const [angleQtyStr, setAngleQtyStr] = useState('1');

  // Flat Bar states
  const [flatIdx, setFlatIdx] = useState(3);
  const [flatLengthStr, setFlatLengthStr] = useState('6.0');
  const [flatQtyStr, setFlatQtyStr] = useState('1');

  // Round Bar states
  const [roundIdx, setRoundIdx] = useState(4);
  const [roundLengthStr, setRoundLengthStr] = useState('6.0');
  const [roundQtyStr, setRoundQtyStr] = useState('1');

  // Square Bar states
  const [squareIdx, setSquareIdx] = useState(2);
  const [squareLengthStr, setSquareLengthStr] = useState('6.0');
  const [squareQtyStr, setSquareQtyStr] = useState('1');

  // Grating states
  const [gratingIdx, setGratingIdx] = useState(1);
  const [gratingLengthStr, setGratingLengthStr] = useState('1.0');
  const [gratingWidthStr, setGratingWidthStr] = useState('1.0');
  const [gratingQtyStr, setGratingQtyStr] = useState('1');

  // Bordes states
  const [bordesIdx, setBordesIdx] = useState(2);
  const [bordesLengthStr, setBordesLengthStr] = useState('2.44');
  const [bordesWidthStr, setBordesWidthStr] = useState('1.22');
  const [bordesQtyStr, setBordesQtyStr] = useState('1');

  // Channel states
  const [channelIdx, setChannelIdx] = useState(3);
  const [channelLengthStr, setChannelLengthStr] = useState('6.0');
  const [channelQtyStr, setChannelQtyStr] = useState('1');

  // --- Fitur Catatan Cepat Lapangan (Unstructured Field Observation) ---
  const [showQuickNotes, setShowQuickNotes] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [extractedSummary, setExtractedSummary] = useState<string[] | null>(null);
  const [quickDrafts, setQuickDrafts] = useState<Array<{ id: string; text: string; date: string }>>([]);
  const [showDraftsList, setShowDraftsList] = useState(false);
  const recognitionRef = useRef<any>(null);

  const DRAFTS_STORAGE_KEY = `shipyard_survey_field_drafts_${projectId || 'default'}`;

  // Load saved drafts on mount / projectId change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setQuickDrafts(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load quick drafts', e);
    }
  }, [DRAFTS_STORAGE_KEY]);

  const saveDraftsToStorage = (drafts: Array<{ id: string; text: string; date: string }>) => {
    setQuickDrafts(drafts);
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (e) {
      console.warn('Failed to save quick drafts', e);
    }
  };

  const handleSaveDraft = () => {
    if (!quickNoteText.trim()) return;
    const newDraft = {
      id: `draft-${Date.now()}`,
      text: quickNoteText.trim(),
      date: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newDraft, ...quickDrafts];
    saveDraftsToStorage(updated);
    setShowDraftsList(true);
  };

  const handleDeleteDraft = (id: string) => {
    const updated = quickDrafts.filter((d) => d.id !== id);
    saveDraftsToStorage(updated);
  };

  // Smart Parser for Unstructured Field Notes
  const parseUnstructuredNote = (text: string) => {
    const result: {
      zone?: string;
      materialCat?: MaterialCategory;
      length?: number;
      width?: number;
      thickness?: number;
      plateGrade?: SteelPlateGrade;
      pipeNps?: string;
      pipeSch?: string;
      remedyAction?: string;
      extractedDetails: string[];
    } = {
      extractedDetails: [],
    };

    const lower = text.toLowerCase();

    // 1. Zone detection (e.g. TK1, Main Deck, Fr. 15-20, Bulwark, Bottom, Side Shell, Engine Room)
    const zoneRegex = /\b(?:tk\s*\d+[a-z]?|tank\s*\d+[a-z]?|main\s*deck|fore\s*peak|aft\s*peak|fr(?:ame)?\.?\s*\d+(?:\s*-\s*\d+)?|bulwark(?:\s*[a-z]+)?|bottom(?:\s*p\/s|\s*port|\s*stbd|\s*starboard)?|side\s*shell|kamar\s*mesin|engine\s*room|coffer\s*dam|double\s*bottom|poop\s*deck|forecastle)\b/i;
    const zoneMatch = text.match(zoneRegex);
    if (zoneMatch) {
      result.zone = zoneMatch[0].trim().toUpperCase();
      result.extractedDetails.push(`Zona: ${result.zone}`);
    }

    // 2. Material Category detection
    if (
      lower.includes('pipa') ||
      lower.includes('pipe') ||
      lower.includes('sounding') ||
      lower.includes('bilge') ||
      lower.includes('ballast line') ||
      lower.includes('overboard')
    ) {
      result.materialCat = 'pipe';
      result.extractedDetails.push('Kategori: Pipa & Schedule');

      // Pipe NPS: 1/2", 3/4", 1", 1-1/4", 1-1/2", 2", 2.5", 3", 4", 5", 6", 8", 10", 12"
      const pipeSizeMatch = text.match(/\b(1\/2|3\/4|1|1-1\/4|1-1\/2|2|2-1\/2|2\.5|3|4|5|6|8|10|12)\s*(?:\"|inch|in)?\b/i);
      if (pipeSizeMatch) {
        let nps = pipeSizeMatch[1];
        if (nps === '2.5') nps = '2-1/2"';
        else if (!nps.endsWith('"')) nps = `${nps}"`;
        result.pipeNps = nps;
        result.extractedDetails.push(`Ukuran Pipa: ${nps}`);
      }

      // Schedule: sch 40, sch 80, sch 160
      const schMatch = text.match(/\bsch(?:edule)?\s*(40|80|160|xs|xxs)\b/i);
      if (schMatch) {
        const sch = `Sch ${schMatch[1].toUpperCase()}`;
        result.pipeSch = sch;
        result.extractedDetails.push(`Schedule: ${sch}`);
      }
    } else if (
      lower.includes('hbeam') ||
      lower.includes('h-beam') ||
      lower.includes('wf') ||
      lower.includes('wide flange') ||
      lower.includes('i-beam')
    ) {
      result.materialCat = 'hbeam';
      result.extractedDetails.push('Kategori: H-Beam / WF');
    } else if (
      lower.includes('siku') ||
      lower.includes('angle bar') ||
      lower.includes('angle') ||
      lower.includes('profil l')
    ) {
      result.materialCat = 'angle';
      result.extractedDetails.push('Kategori: Angle Bar (Siku)');
    } else if (
      lower.includes('bordes') ||
      lower.includes('chequered') ||
      lower.includes('checker') ||
      lower.includes('plat kembang')
    ) {
      result.materialCat = 'bordes';
      result.extractedDetails.push('Kategori: Plat Bordes');
    } else if (lower.includes('grating')) {
      result.materialCat = 'grating';
      result.extractedDetails.push('Kategori: Grating Plate');
    } else if (
      lower.includes('flat bar') ||
      lower.includes('plat strip') ||
      lower.includes('strip bar')
    ) {
      result.materialCat = 'flatbar';
      result.extractedDetails.push('Kategori: Flat Bar');
    } else if (
      lower.includes('round bar') ||
      lower.includes('besi as') ||
      lower.includes('round')
    ) {
      result.materialCat = 'roundbar';
      result.extractedDetails.push('Kategori: Round Bar');
    } else if (
      lower.includes('square bar') ||
      lower.includes('besi nako') ||
      lower.includes('nako')
    ) {
      result.materialCat = 'squarebar';
      result.extractedDetails.push('Kategori: Square Bar');
    } else if (
      lower.includes('unp') ||
      lower.includes('kanal') ||
      lower.includes('channel')
    ) {
      result.materialCat = 'channel';
      result.extractedDetails.push('Kategori: Channel (UNP)');
    } else if (
      lower.includes('pelat') ||
      lower.includes('plat') ||
      lower.includes('plate') ||
      lower.includes('replating') ||
      lower.includes('crop')
    ) {
      result.materialCat = 'plate';
      result.extractedDetails.push('Kategori: Pelat Lambung');
    }

    // 3. Plate Grade detection
    if (lower.includes('abs')) {
      result.plateGrade = 'ABS';
      result.extractedDetails.push('Grade: ABS');
    } else if (lower.includes('bki')) {
      result.plateGrade = 'BKI';
      result.extractedDetails.push('Grade: BKI');
    } else if (lower.includes('non-class') || lower.includes('non class') || lower.includes('nc')) {
      result.plateGrade = 'NC';
      result.extractedDetails.push('Grade: NC (Non-Class)');
    }

    // 4. Dimensions detection:
    // 2D dimension e.g. "2.5 x 1.2" or "2,5 x 1,2" or "2.5x1.2" or "2.5 m x 1.2 m"
    const dim2dMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m|meter)?\s*[xX*×]\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter)?/);
    if (dim2dMatch) {
      const l = parseFloat(dim2dMatch[1].replace(',', '.'));
      const w = parseFloat(dim2dMatch[2].replace(',', '.'));
      if (!isNaN(l) && l > 0) result.length = l;
      if (!isNaN(w) && w > 0) result.width = w;
      result.extractedDetails.push(`Dimensi: ${l}m × ${w}m`);
    } else {
      // Single length: e.g. "panjang 3m", "pjg 4 meter", "length 6m"
      const lengthMatch = text.match(/(?:panjang|pjg|length|len|p)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter)?/i);
      if (lengthMatch) {
        const l = parseFloat(lengthMatch[1].replace(',', '.'));
        if (!isNaN(l) && l > 0) {
          result.length = l;
          result.extractedDetails.push(`Panjang: ${l}m`);
        }
      }
    }

    // Thickness: e.g. "tebal 12mm", "14mm", "t=12", "t 14", "tbl 10"
    const thickMatch =
      text.match(/(?:tebal|tbl|thickness|thk|t)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i) ||
      text.match(/\b(\d+(?:[.,]\d+)?)\s*mm\b/i);
    if (thickMatch) {
      const t = parseFloat(thickMatch[1].replace(',', '.'));
      if (!isNaN(t) && t > 0) {
        result.thickness = t;
        result.extractedDetails.push(`Tebal: ${t}mm`);
      }
    }

    // 5. Remedy Action detection
    if (
      lower.includes('crop') ||
      lower.includes('replating') ||
      lower.includes('ganti pelat') ||
      lower.includes('renew plate')
    ) {
      result.remedyAction = 'Crop & Replating';
      result.extractedDetails.push('Tindakan: Crop & Replating');
    } else if (
      lower.includes('renewal pipe') ||
      lower.includes('ganti pipa') ||
      lower.includes('pipa bocor')
    ) {
      result.remedyAction = 'Renewal Pipe Line';
      result.extractedDetails.push('Tindakan: Renewal Pipe Line');
    } else if (
      lower.includes('stiffener') ||
      lower.includes('gading') ||
      lower.includes('profile')
    ) {
      result.remedyAction = 'Renewal Profile Stiffener';
      result.extractedDetails.push('Tindakan: Renewal Profile Stiffener');
    } else if (lower.includes('grating')) {
      result.remedyAction = 'Renewal Deck Grating';
      result.extractedDetails.push('Tindakan: Renewal Deck Grating');
    } else if (lower.includes('bordes') || lower.includes('chequered')) {
      result.remedyAction = 'Renewal Chequered Plate';
      result.extractedDetails.push('Tindakan: Renewal Chequered Plate');
    } else if (lower.includes('doubler') || lower.includes('tambal')) {
      result.remedyAction = 'Doubler Plate Sementara';
      result.extractedDetails.push('Tindakan: Doubler Plate Sementara');
    } else if (
      lower.includes('gouging') ||
      lower.includes('reweld') ||
      lower.includes('las ulang') ||
      lower.includes('retak las')
    ) {
      result.remedyAction = 'Gouging & Re-welding';
      result.extractedDetails.push('Tindakan: Gouging & Re-welding');
    } else if (
      lower.includes('fairing') ||
      lower.includes('pemanasan') ||
      lower.includes('press') ||
      lower.includes('luruskan')
    ) {
      result.remedyAction = 'Fairing / Pemanasan';
      result.extractedDetails.push('Tindakan: Fairing / Pemanasan');
    }

    return result;
  };

  const handleApplyQuickNote = (noteToApply?: string) => {
    const text = noteToApply || quickNoteText;
    if (!text.trim()) return;

    const parsed = parseUnstructuredNote(text);

    if (parsed.zone) {
      setZone(parsed.zone);
    }
    if (parsed.materialCat) {
      setMaterialCat(parsed.materialCat);
    }
    if (parsed.remedyAction) {
      setRemedyAction(parsed.remedyAction);
    }
    if (parsed.plateGrade) {
      setPlateGrade(parsed.plateGrade);
    }
    if (parsed.pipeNps) {
      setPipeNps(parsed.pipeNps);
    }
    if (parsed.pipeSch) {
      setPipeSch(parsed.pipeSch);
    }
    if (parsed.length !== undefined) {
      if (parsed.materialCat === 'pipe') setPipeLengthStr(String(parsed.length));
      else if (parsed.materialCat === 'hbeam') setHbeamLengthStr(String(parsed.length));
      else if (parsed.materialCat === 'angle') setAngleLengthStr(String(parsed.length));
      else if (parsed.materialCat === 'flatbar') setFlatLengthStr(String(parsed.length));
      else if (parsed.materialCat === 'roundbar') setRoundLengthStr(String(parsed.length));
      else if (parsed.materialCat === 'squarebar') setSquareLengthStr(String(parsed.length));
      else if (parsed.materialCat === 'grating') setGratingLengthStr(String(parsed.length));
      else if (parsed.materialCat === 'bordes') setBordesLengthStr(String(parsed.length));
      else if (parsed.materialCat === 'channel') setChannelLengthStr(String(parsed.length));
      else setPlateLengthStr(String(parsed.length));
    }
    if (parsed.width !== undefined) {
      if (parsed.materialCat === 'grating') setGratingWidthStr(String(parsed.width));
      else if (parsed.materialCat === 'bordes') setBordesWidthStr(String(parsed.width));
      else setPlateWidthStr(String(parsed.width));
    }
    if (parsed.thickness !== undefined) {
      setPlateThickStr(String(parsed.thickness));
    }

    // Set description: if empty or user wants to use observation text
    setDesc((prev) => {
      if (!prev.trim()) return text.trim();
      return `${prev} - [Catatan Lapangan]: ${text.trim()}`;
    });

    setExtractedSummary(
      parsed.extractedDetails.length > 0
        ? parsed.extractedDetails
        : ['Catatan lapangan berhasil diterapkan ke formulir!']
    );
  };

  const handleCopyRawToDesc = () => {
    if (!quickNoteText.trim()) return;
    setDesc(quickNoteText.trim());
    setExtractedSummary(['Catatan disalin langsung ke Deskripsi Kerusakan!']);
  };

  // Toggle Web Speech Recognition for field voice dictation
  const toggleListening = () => {
    setSpeechError('');
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setSpeechError(
        'Fitur Dikte Suara (Web Speech API) tidak didukung pada browser ini. Silakan ketik langsung atau gunakan Chrome/Edge.'
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setQuickNoteText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error !== 'no-speech') {
            setSpeechError(`Dikte suara: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.warn('Speech error:', err);
        setIsListening(false);
        setSpeechError('Gagal memulai rekaman suara. Pastikan izin mikrofon telah diberikan.');
      }
    }
  };

  const QUICK_OBSERVATION_TEMPLATES = [
    {
      title: 'Pelat Bottom Deformasi',
      text: 'TK1 Port Side lajur B pelat bottom deformasi bergelombang ukuran 2.5 x 1.2 m tebal 14mm BKI crop replating',
    },
    {
      title: 'Pipa Ballast Bocor',
      text: 'Pipa sounding ballast tank 3 bocor keropos dekat flange ukuran 2 inch sch 40 panjang 4m renewal pipe',
    },
    {
      title: 'Gading Web Frame Retak',
      text: 'Gading web frame Fr. 18-22 retak butt joint las profil L 100x100x10 panjang 3m gouging & reweld',
    },
    {
      title: 'Plat Bordes Catwalk Aus',
      text: 'Main deck catwalk plat bordes aus licin tebal 4.5mm ukuran 2.44 x 1.22 renewal bordes',
    },
    {
      title: 'Sea Chest Grid Keropos',
      text: 'Sea chest grid starboard side keropos penipisan pelat 10mm ukuran 1.5 x 1.0 m crop replating',
    },
  ];

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (initialSurvey) {
      setZone(initialSurvey.locationZone);
      setDesc(initialSurvey.defectDescription);
      setRemedyAction(initialSurvey.remedyAction || 'Crop & Replating');

      const pt = initialSurvey.plateType || '';
      if (pt.startsWith('Pipa') || pt.startsWith('PP')) {
        setMaterialCat('pipe');
        setPipeLengthStr(String(initialSurvey.length || 6.0));
      } else if (pt.startsWith('H-') || pt.startsWith('WF')) {
        setMaterialCat('hbeam');
        setHbeamLengthStr(String(initialSurvey.length || 6.0));
      } else if (pt.startsWith('Angle') || pt.startsWith('L ') || pt.startsWith('Siku')) {
        setMaterialCat('angle');
        setAngleLengthStr(String(initialSurvey.length || 6.0));
      } else if (pt.startsWith('Flat') || pt.startsWith('FB')) {
        setMaterialCat('flatbar');
        setFlatLengthStr(String(initialSurvey.length || 6.0));
      } else if (pt.startsWith('Round') || pt.startsWith('RB')) {
        setMaterialCat('roundbar');
        setRoundLengthStr(String(initialSurvey.length || 6.0));
      } else if (pt.startsWith('Square') || pt.startsWith('SB') || pt.startsWith('Nako')) {
        setMaterialCat('squarebar');
        setSquareLengthStr(String(initialSurvey.length || 6.0));
      } else if (pt.startsWith('Grating')) {
        setMaterialCat('grating');
        setGratingLengthStr(String(initialSurvey.length || 1.0));
        setGratingWidthStr(String(initialSurvey.width || 1.0));
      } else if (pt.startsWith('Bordes') || pt.startsWith('PL-BORDES')) {
        setMaterialCat('bordes');
        setBordesLengthStr(String(initialSurvey.length || 2.44));
        setBordesWidthStr(String(initialSurvey.width || 1.22));
      } else if (pt.startsWith('Channel') || pt.startsWith('UNP')) {
        setMaterialCat('channel');
        setChannelLengthStr(String(initialSurvey.length || 6.0));
      } else {
        setMaterialCat('plate');
        setPlateLengthStr(String(initialSurvey.length || 1.5));
        setPlateWidthStr(String(initialSurvey.width || 1.0));
        setPlateThickStr(String(initialSurvey.thickness || 10));
        const ptUpper = (pt || '').toUpperCase();
        if (ptUpper.includes('ABS')) {
          setPlateGrade('ABS');
        } else if (ptUpper.includes('NC') || ptUpper.includes('NON-CLASS') || ptUpper.includes('NON CLASS')) {
          setPlateGrade('NC');
        } else {
          setPlateGrade('BKI');
        }
      }
    } else {
      setZone('');
      setDesc('');
      setMaterialCat('plate');
      setPlateLengthStr('1.5');
      setPlateWidthStr('1.0');
      setPlateThickStr('10');
      setPlateGrade('BKI');
      setRemedyAction('Crop & Replating');
    }
    setError('');
    setExtractedSummary(null);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
    };
  }, [initialSurvey, isOpen]);

  if (!isOpen) return null;

  // --- Calculate Live Weight & Specs based on Material Category ---
  let calculatedWeight = 0;
  let formulaSummary = '';
  let materialSpecName = '';
  let storedLength = 0;
  let storedWidth = 0;
  let storedThick = 0;

  if (materialCat === 'pipe') {
    const selectedPipe = STANDARD_PIPES.find((p) => p.nps === pipeNps) || STANDARD_PIPES[5];
    const selectedSchedule =
      selectedPipe.schedules.find((s) => s.sch === pipeSch) || selectedPipe.schedules[0];

    const od = isCustomPipe ? parseFloat(customOdStr) || 0 : selectedPipe.odMm;
    const wt = isCustomPipe ? parseFloat(customWtStr) || 0 : selectedSchedule.wtMm;
    const lengthM = parseFloat(pipeLengthStr) || 0;
    const qty = parseFloat(pipeQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculatePipeWeight({
      outerDiameterMm: od,
      wallThicknessMm: wt,
      lengthM,
      qty,
    });

    storedLength = lengthM;
    storedWidth = od;
    storedThick = wt;
    materialSpecName = isCustomPipe ? `Pipa OD ${od}x${wt}mm` : `Pipa ${pipeNps} ${pipeSch}`;
    formulaSummary = `(OD ${od} - WT ${wt}) × ${wt} × 0.02466 × ${lengthM}m × ${qty}`;
  } else if (materialCat === 'hbeam') {
    const profile = STANDARD_HBEAMS[hbeamIdx] || STANDARD_HBEAMS[0];
    const lengthM = parseFloat(hbeamLengthStr) || 0;
    const qty = parseFloat(hbeamQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateHBeamWeight({
      weightKgM: profile.weightKgM,
      lengthM,
      qty,
    });

    storedLength = lengthM;
    storedWidth = 0;
    storedThick = profile.weightKgM;
    materialSpecName = profile.name;
    formulaSummary = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthM}m × ${qty}`;
  } else if (materialCat === 'angle') {
    const profile = STANDARD_ANGLES[angleIdx] || STANDARD_ANGLES[0];
    const lengthM = parseFloat(angleLengthStr) || 0;
    const qty = parseFloat(angleQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateAngleBarWeight({
      weightKgM: profile.weightKgM,
      lengthM,
      qty,
    });

    storedLength = lengthM;
    storedWidth = 0;
    storedThick = profile.weightKgM;
    materialSpecName = `Angle Bar ${profile.name}`;
    formulaSummary = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthM}m × ${qty}`;
  } else if (materialCat === 'flatbar') {
    const profile = STANDARD_FLATBARS[flatIdx] || STANDARD_FLATBARS[0];
    const lengthM = parseFloat(flatLengthStr) || 0;
    const qty = parseFloat(flatQtyStr) || 1;

    calculatedWeight = Math.round(profile.weightKgM * lengthM * qty * 100) / 100;
    storedLength = lengthM;
    storedWidth = 0;
    storedThick = profile.weightKgM;
    materialSpecName = `Flat Bar ${profile.name}`;
    formulaSummary = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthM}m × ${qty}`;
  } else if (materialCat === 'roundbar') {
    const profile = STANDARD_ROUNDBARS[roundIdx] || STANDARD_ROUNDBARS[0];
    const lengthM = parseFloat(roundLengthStr) || 0;
    const qty = parseFloat(roundQtyStr) || 1;

    calculatedWeight = Math.round(profile.weightKgM * lengthM * qty * 100) / 100;
    storedLength = lengthM;
    storedWidth = 0;
    storedThick = profile.weightKgM;
    materialSpecName = profile.name;
    formulaSummary = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthM}m × ${qty}`;
  } else if (materialCat === 'squarebar') {
    const profile = STANDARD_SQUAREBARS[squareIdx] || STANDARD_SQUAREBARS[0];
    const lengthM = parseFloat(squareLengthStr) || 0;
    const qty = parseFloat(squareQtyStr) || 1;

    calculatedWeight = Math.round(profile.weightKgM * lengthM * qty * 100) / 100;
    storedLength = lengthM;
    storedWidth = 0;
    storedThick = profile.weightKgM;
    materialSpecName = profile.name;
    formulaSummary = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthM}m × ${qty}`;
  } else if (materialCat === 'grating') {
    const profile = STANDARD_GRATINGS[gratingIdx] || STANDARD_GRATINGS[0];
    const lengthM = parseFloat(gratingLengthStr) || 0;
    const widthM = parseFloat(gratingWidthStr) || 0;
    const qty = parseFloat(gratingQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateGratingWeight({
      lengthM,
      widthM,
      weightKgM2: profile.weightKgM2,
      qty,
    });

    storedLength = lengthM;
    storedWidth = widthM;
    storedThick = profile.weightKgM2;
    materialSpecName = profile.name;
    formulaSummary = `${lengthM}m × ${widthM}m (${(lengthM * widthM).toFixed(2)}m²) × ${profile.weightKgM2} kg/m² × ${qty}`;
  } else if (materialCat === 'bordes') {
    const profile = STANDARD_BORDES[bordesIdx] || STANDARD_BORDES[0];
    const lengthM = parseFloat(bordesLengthStr) || 0;
    const widthM = parseFloat(bordesWidthStr) || 0;
    const qty = parseFloat(bordesQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateBordesWeight({
      lengthM,
      widthM,
      weightKgM2: profile.weightKgM2,
      qty,
    });

    storedLength = lengthM;
    storedWidth = widthM;
    storedThick = profile.thicknessMm;
    materialSpecName = profile.name;
    formulaSummary = `${lengthM}m × ${widthM}m (${(lengthM * widthM).toFixed(2)}m²) × ${profile.weightKgM2} kg/m² × ${qty}`;
  } else if (materialCat === 'channel') {
    const profile = STANDARD_CHANNELS[channelIdx] || STANDARD_CHANNELS[0];
    const lengthM = parseFloat(channelLengthStr) || 0;
    const qty = parseFloat(channelQtyStr) || 1;

    calculatedWeight = TonnageCalculator.calculateChannelWeight({
      weightKgM: profile.weightKgM,
      lengthM,
      qty,
    });

    storedLength = lengthM;
    storedWidth = 0;
    storedThick = profile.weightKgM;
    materialSpecName = `Kanal ${profile.name}`;
    formulaSummary = `${profile.name} (${profile.weightKgM} kg/m) × ${lengthM}m × ${qty}`;
  } else {
    // Standard Plate (3 Opsi: ABS, BKI, NC)
    const lengthM = parseFloat(plateLengthStr) || 0;
    const widthM = parseFloat(plateWidthStr) || 0;
    const thickMm = parseFloat(plateThickStr) || 0;
    const gradeObj = STEEL_PLATE_GRADES.find((g) => g.grade === plateGrade) || STEEL_PLATE_GRADES[1];
    const density = gradeObj.density; // 7.85

    calculatedWeight = TonnageCalculator.calculatePlateWeight({
      length: lengthM,
      width: widthM,
      thickness: thickMm,
      density,
    });

    storedLength = lengthM;
    storedWidth = widthM;
    storedThick = thickMm;
    materialSpecName = `Grade ${plateGrade}`;
    formulaSummary = `${lengthM}m × ${widthM}m × ${thickMm}mm × ${density} kg/dm³ (${gradeObj.fullName})`;
  }

  const formattedLiveWeight = TonnageCalculator.formatWeight(calculatedWeight);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone.trim()) {
      setError('Lokasi Zona tidak boleh kosong! (Contoh: TK1, Main Deck)');
      return;
    }
    if (calculatedWeight <= 0) {
      setError('Dimensi atau panjang material harus bernilai lebih dari 0!');
      return;
    }

    onSave(
      {
        projectId,
        locationZone: zone.trim(),
        defectDescription: desc.trim() || `Kerusakan ${materialSpecName}`,
        length: storedLength,
        width: storedWidth,
        thickness: storedThick,
        plateType: materialSpecName,
        calculatedWeightKg: calculatedWeight,
        syncStatus: 0,
        remedyAction,
      },
      initialSurvey ? initialSurvey.id : undefined
    );

    onClose();
  };

  const categoriesList: { id: MaterialCategory; label: string }[] = [
    { id: 'plate', label: 'Pelat Lambung' },
    { id: 'pipe', label: 'Pipa & Schedule' },
    { id: 'hbeam', label: 'H-Beam / WF' },
    { id: 'angle', label: 'Angle Bar (Siku)' },
    { id: 'flatbar', label: 'Flat Bar (Strip)' },
    { id: 'roundbar', label: 'Round Bar (As)' },
    { id: 'squarebar', label: 'Square Bar (Nako)' },
    { id: 'grating', label: 'Grating Plate' },
    { id: 'bordes', label: 'Plat Bordes' },
    { id: 'channel', label: 'Channel (UNP)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {initialSurvey ? 'Edit Data Kerusakan Lapangan' : 'Input Survey Kerusakan Baru (Offline)'}
            </h3>
            <p className="text-xs text-slate-500">
              Pilih material pelat, pipa, profil baja, grating, atau bordes dengan kalkulasi tonase instan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          {/* Quick Field Notes Section (Catatan Cepat Observasi Lapangan) */}
          <div className="rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-orange-50/80 p-2.5 sm:p-3 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs shrink-0">
                  <Zap className="w-4 h-4 fill-amber-100" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-amber-950">Catatan Cepat Lapangan</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-200/70 text-amber-800 border border-amber-300">
                      Observasi Bebas &amp; Dikte Suara
                    </span>
                    {quickDrafts.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {quickDrafts.length} Draf
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-800/80 truncate">
                    Tulis atau dikte observasi mentah dari lapangan, otomatis ekstrak dimensi &amp; isi form.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickNotes(!showQuickNotes)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-white/90 border border-amber-300 hover:bg-amber-100 transition-colors shrink-0 shadow-2xs"
              >
                {showQuickNotes ? (
                  <>
                    <span>Tutup</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Buka Catatan</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Expanded Quick Notes Panel */}
            {showQuickNotes && (
              <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Speech Error Banner if any */}
                {speechError && (
                  <div className="p-2 rounded-lg bg-red-100 text-red-800 text-[11px] border border-red-200 flex items-center justify-between">
                    <span>{speechError}</span>
                    <button type="button" onClick={() => setSpeechError('')} className="text-xs font-bold ml-2">✕</button>
                  </div>
                )}

                {/* Observation Textarea */}
                <div className="relative">
                  <textarea
                    rows={3}
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    placeholder={`Tulis observasi lapangan bebas di sini...\nContoh: "TK1 Port Side lajur B pelat bottom bergelombang ukuran 2.5 x 1.2 m tebal 14mm BKI crop replating" atau "Pipa sounding ballast 3 bocor 2 inch sch 40 panjang 4m renewal pipe"`}
                    className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-sans text-slate-800 placeholder:text-slate-400 shadow-inner"
                  />

                  {/* Listening Indicator Overlay/Pill */}
                  {isListening && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-red-600 text-white rounded-full text-[10px] font-bold shadow-md animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>Mendengarkan Dikte Suara...</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Voice Dictation Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border shadow-xs transition-colors ${
                        isListening
                          ? 'bg-red-600 text-white border-red-700 animate-pulse'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                      title="Diktekan suara Anda secara hands-free di lapangan"
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-red-500" />}
                      <span>{isListening ? 'Hentikan Dikte' : 'Dikte Suara (Mic)'}</span>
                    </button>

                    {/* Save Draft */}
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={!quickNoteText.trim()}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                      <span>Simpan Draf</span>
                    </button>

                    {/* Copy to Description */}
                    <button
                      type="button"
                      onClick={handleCopyRawToDesc}
                      disabled={!quickNoteText.trim()}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                      <span>Salin ke Deskripsi</span>
                    </button>

                    {quickNoteText && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickNoteText('');
                          setExtractedSummary(null);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-amber-100 transition-colors"
                        title="Bersihkan teks"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Primary Extract & Apply Button */}
                  <button
                    type="button"
                    onClick={() => handleApplyQuickNote()}
                    disabled={!quickNoteText.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>⚡ Ekstrak &amp; Terapkan ke Form</span>
                  </button>
                </div>

                {/* Extracted Feedback Banner */}
                {extractedSummary && extractedSummary.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold mb-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Hasil Ekstraksi Catatan Lapangan Berhasil Diterapkan:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedSummary.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200 text-[11px] font-medium font-mono shadow-2xs"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Template Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                      Template Observasi Umum (Klik untuk Pakai):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_OBSERVATION_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQuickNoteText(tmpl.text);
                          handleApplyQuickNote(tmpl.text);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/90 text-amber-900 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-colors shadow-2xs text-left"
                      >
                        📌 {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Saved Drafts Drawer / List */}
                {quickDrafts.length > 0 && (
                  <div className="pt-2 border-t border-amber-200/70">
                    <button
                      type="button"
                      onClick={() => setShowDraftsList(!showDraftsList)}
                      className="flex items-center justify-between w-full text-[11px] font-bold text-amber-900 hover:text-amber-950 py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-amber-700" />
                        Draf Observasi Lapangan Tersimpan ({quickDrafts.length})
                      </span>
                      <span className="text-amber-700">{showDraftsList ? 'Sembunyikan ▲' : 'Lihat ▼'}</span>
                    </button>

                    {showDraftsList && (
                      <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {quickDrafts.map((draft) => (
                          <div
                            key={draft.id}
                            className="p-2 rounded-lg bg-white border border-amber-200 text-xs flex items-center justify-between gap-2 hover:border-amber-400 transition-all shadow-2xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-slate-800 text-[11px] line-clamp-1">{draft.text}</p>
                              <span className="text-[10px] text-slate-400 font-mono">Disimpan pukul {draft.date}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickNoteText(draft.text);
                                  handleApplyQuickNote(draft.text);
                                }}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-[10px] font-bold transition-colors"
                                title="Gunakan dan terapkan draf ini ke formulir"
                              >
                                ⚡ Terapkan
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(draft.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Hapus draf ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lokasi Zona Kapal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: TK1, Main Deck Fr. 15-20, Bulwark"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rencana Tindakan
              </label>
              <select
                value={remedyAction}
                onChange={(e) => setRemedyAction(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Crop & Replating">Crop &amp; Replating</option>
                <option value="Renewal Pipe Line">Renewal Pipe Line (Ganti Jalur Pipa)</option>
                <option value="Renewal Profile Stiffener">Renewal Profile Stiffener</option>
                <option value="Renewal Deck Grating">Renewal Deck Grating</option>
                <option value="Renewal Chequered Plate">Renewal Chequered Plate (Bordes)</option>
                <option value="Doubler Plate Sementara">Doubler Plate Sementara</option>
                <option value="Gouging & Re-welding">Gouging &amp; Re-welding</option>
                <option value="Fairing / Pemanasan">Fairing / Pemanasan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi Kerusakan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Pipa sea chest keropos penipisan > 50%, atau pelat lambung terkorosi"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Material Category Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Pilih Kategori Material
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {categoriesList.map((cat) => {
                const isSelected = materialCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setMaterialCat(cat.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors truncate ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Dimensional Inputs */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            {/* --- PELAT BAJA --- */}
            {materialCat === 'plate' && (
              <div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Panjang (m) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={plateLengthStr}
                      onChange={(e) => setPlateLengthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lebar (m) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={plateWidthStr}
                      onChange={(e) => setPlateWidthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tebal (mm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={plateThickStr}
                      onChange={(e) => setPlateThickStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Grade Pelat Baja (Pilih salah satu)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Density: 7.85 kg/dm³
                    </span>
                  </div>
                  {/* 3 Opsi: ABS, BKI, NC */}
                  <div className="grid grid-cols-3 gap-2">
                    {STEEL_PLATE_GRADES.map((g) => {
                      const isSelected = plateGrade === g.grade;
                      return (
                        <button
                          key={g.grade}
                          type="button"
                          onClick={() => setPlateGrade(g.grade)}
                          className={`px-3 py-2 rounded-xl text-left border transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                              {g.name}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                g.grade === 'ABS'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : g.grade === 'BKI'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {g.code}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                            {g.grade === 'ABS'
                              ? 'Marine Class IACS'
                              : g.grade === 'BKI'
                              ? 'Marine Class BKI'
                              : 'Non-Class Standar'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* --- PIPA & SCHEDULE --- */}
            {materialCat === 'pipe' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Spesifikasi Pipa &amp; Schedule</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustomPipe}
                      onChange={(e) => setIsCustomPipe(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Custom OD/WT</span>
                  </label>
                </div>

                {!isCustomPipe ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-0.5">Ukuran Nominal (NPS)</label>
                      <select
                        value={pipeNps}
                        onChange={(e) => {
                          const n = e.target.value;
                          setPipeNps(n);
                          const pipe = STANDARD_PIPES.find((p) => p.nps === n);
                          if (pipe && !pipe.schedules.some((s) => s.sch === pipeSch)) {
                            setPipeSch(pipe.schedules[0].sch);
                          }
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                      >
                        {STANDARD_PIPES.map((p) => (
                          <option key={p.nps} value={p.nps}>
                            {p.nps} (OD: {p.odMm} mm)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-0.5">Schedule</label>
                      <select
                        value={pipeSch}
                        onChange={(e) => setPipeSch(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                      >
                        {STANDARD_PIPES.find((p) => p.nps === pipeNps)?.schedules.map((s) => (
                          <option key={s.sch} value={s.sch}>
                            {s.sch} &bull; WT {s.wtMm}mm &bull; {s.weightKgM} kg/m
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-0.5">Outer Diameter (OD mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customOdStr}
                        onChange={(e) => setCustomOdStr(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-0.5">Wall Thickness (WT mm)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={customWtStr}
                        onChange={(e) => setCustomWtStr(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Panjang (Meter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pipeLengthStr}
                      onChange={(e) => setPipeLengthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Jumlah Batang / Jalur
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={pipeQtyStr}
                      onChange={(e) => setPipeQtyStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- H-BEAM / WF --- */}
            {materialCat === 'hbeam' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Profil H-Beam / WF Standar
                  </label>
                  <select
                    value={hbeamIdx}
                    onChange={(e) => setHbeamIdx(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_HBEAMS.map((h, i) => (
                      <option key={h.size} value={i}>
                        {h.name} &bull; {h.weightKgM} kg/m &bull; ({h.dimensions})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={hbeamLengthStr}
                      onChange={(e) => setHbeamLengthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Jumlah (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={hbeamQtyStr}
                      onChange={(e) => setHbeamQtyStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- ANGLE BAR (SIKU) --- */}
            {materialCat === 'angle' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ukuran Besi Siku (L-Bar)
                  </label>
                  <select
                    value={angleIdx}
                    onChange={(e) => setAngleIdx(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_ANGLES.map((a, i) => (
                      <option key={a.size} value={i}>
                        {a.name} &bull; {a.weightKgM} kg/m &bull; ({a.dimensions})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={angleLengthStr}
                      onChange={(e) => setAngleLengthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Jumlah (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={angleQtyStr}
                      onChange={(e) => setAngleQtyStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- FLAT BAR (STRIP) --- */}
            {materialCat === 'flatbar' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ukuran Flat Bar (Plat Strip)
                  </label>
                  <select
                    value={flatIdx}
                    onChange={(e) => setFlatIdx(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_FLATBARS.map((f, i) => (
                      <option key={f.size} value={i}>
                        {f.name} &bull; {f.weightKgM} kg/m &bull; ({f.dimensions})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={flatLengthStr}
                      onChange={(e) => setFlatLengthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Jumlah (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={flatQtyStr}
                      onChange={(e) => setFlatQtyStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- ROUND BAR (BESI AS) --- */}
            {materialCat === 'roundbar' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Diameter Besi As (Round Bar)
                  </label>
                  <select
                    value={roundIdx}
                    onChange={(e) => setRoundIdx(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_ROUNDBARS.map((r, i) => (
                      <option key={r.size} value={i}>
                        {r.name} &bull; {r.weightKgM} kg/m
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={roundLengthStr}
                      onChange={(e) => setRoundLengthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Jumlah (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={roundQtyStr}
                      onChange={(e) => setRoundQtyStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- SQUARE BAR (BESI NAKO) --- */}
            {materialCat === 'squarebar' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ukuran Besi Nako (Kotak Padat)
                  </label>
                  <select
                    value={squareIdx}
                    onChange={(e) => setSquareIdx(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_SQUAREBARS.map((s, i) => (
                      <option key={s.size} value={i}>
                        {s.name} &bull; {s.weightKgM} kg/m
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={squareLengthStr}
                      onChange={(e) => setSquareLengthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Jumlah (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={squareQtyStr}
                      onChange={(e) => setSquareQtyStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- GRATING PLATE --- */}
            {materialCat === 'grating' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Spesifikasi Grating Plate
                  </label>
                  <select
                    value={gratingIdx}
                    onChange={(e) => setGratingIdx(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_GRATINGS.map((g, i) => (
                      <option key={g.size} value={i}>
                        {g.name} &bull; {g.weightKgM2} kg/m&sup2;
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={gratingLengthStr}
                      onChange={(e) => setGratingLengthStr(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">Lebar (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={gratingWidthStr}
                      onChange={(e) => setGratingWidthStr(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">Lembar (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={gratingQtyStr}
                      onChange={(e) => setGratingQtyStr(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- PLAT BORDES --- */}
            {materialCat === 'bordes' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tebal Plat Bordes (Kembang Geladak)
                  </label>
                  <select
                    value={bordesIdx}
                    onChange={(e) => setBordesIdx(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_BORDES.map((b, i) => (
                      <option key={b.thicknessMm} value={i}>
                        {b.name} &bull; {b.weightKgM2} kg/m&sup2;
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bordesLengthStr}
                      onChange={(e) => setBordesLengthStr(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">Lebar (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bordesWidthStr}
                      onChange={(e) => setBordesWidthStr(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">Lembar (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={bordesQtyStr}
                      onChange={(e) => setBordesQtyStr(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- CHANNEL (UNP) --- */}
            {materialCat === 'channel' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Profil Kanal U (UNP)
                  </label>
                  <select
                    value={channelIdx}
                    onChange={(e) => setChannelIdx(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {STANDARD_CHANNELS.map((c, i) => (
                      <option key={c.size} value={i}>
                        {c.name} &bull; {c.weightKgM} kg/m &bull; ({c.dimensions})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={channelLengthStr}
                      onChange={(e) => setChannelLengthStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Jumlah (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={channelQtyStr}
                      onChange={(e) => setChannelQtyStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Weight & Formula Box */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <span className="text-[11px] text-amber-900 font-bold block">
                  {materialSpecName}
                </span>
                <span className="text-[10px] text-amber-700 font-mono">
                  {formulaSummary}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm sm:text-base font-black text-amber-950 block">
                {formattedLiveWeight}
              </span>
              <span className="text-[10px] text-amber-700">Estimasi Tonase</span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Offline (SQLite)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

