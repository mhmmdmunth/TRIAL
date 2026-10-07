import {
  MaterialCategory,
  MaterialOption,
  SteelPlateGrade,
  SteelPlateGradeOption,
  STEEL_PLATE_GRADES,
} from '../types';

/**
 * TonnageCalculator - Comprehensive Shipyard Marine Material & Steel Calculator
 * Standard density for Marine Mild Steel (BKI / IACS Grade A/B): 7.85 kg/dm³ (ton/m³)
 * Stainless Steel: 7.93 kg/dm³
 */

export interface PipeStandard {
  nps: string; // e.g. "1/2\"", "2\"", "4\""
  odMm: number; // Outer diameter in mm
  schedules: {
    sch: string; // e.g. "Sch 40", "Sch 80", "Sch 160"
    wtMm: number; // Wall thickness in mm
    weightKgM: number; // Weight per meter in kg/m
  }[];
}

export const STANDARD_PIPES: PipeStandard[] = [
  {
    nps: '1/2"',
    odMm: 21.3,
    schedules: [
      { sch: 'Sch 40', wtMm: 2.77, weightKgM: 1.27 },
      { sch: 'Sch 80', wtMm: 3.73, weightKgM: 1.62 },
      { sch: 'Sch 160', wtMm: 4.78, weightKgM: 1.95 },
    ],
  },
  {
    nps: '3/4"',
    odMm: 26.7,
    schedules: [
      { sch: 'Sch 40', wtMm: 2.87, weightKgM: 1.69 },
      { sch: 'Sch 80', wtMm: 3.91, weightKgM: 2.20 },
      { sch: 'Sch 160', wtMm: 5.56, weightKgM: 2.90 },
    ],
  },
  {
    nps: '1"',
    odMm: 33.4,
    schedules: [
      { sch: 'Sch 40', wtMm: 3.38, weightKgM: 2.50 },
      { sch: 'Sch 80', wtMm: 4.55, weightKgM: 3.24 },
      { sch: 'Sch 160', wtMm: 6.35, weightKgM: 4.24 },
    ],
  },
  {
    nps: '1-1/4"',
    odMm: 42.2,
    schedules: [
      { sch: 'Sch 40', wtMm: 3.56, weightKgM: 3.39 },
      { sch: 'Sch 80', wtMm: 4.85, weightKgM: 4.47 },
      { sch: 'Sch 160', wtMm: 6.35, weightKgM: 5.61 },
    ],
  },
  {
    nps: '1-1/2"',
    odMm: 48.3,
    schedules: [
      { sch: 'Sch 40', wtMm: 3.68, weightKgM: 4.05 },
      { sch: 'Sch 80', wtMm: 5.08, weightKgM: 5.41 },
      { sch: 'Sch 160', wtMm: 7.14, weightKgM: 7.25 },
    ],
  },
  {
    nps: '2"',
    odMm: 60.3,
    schedules: [
      { sch: 'Sch 40', wtMm: 3.91, weightKgM: 5.44 },
      { sch: 'Sch 80', wtMm: 5.54, weightKgM: 7.48 },
      { sch: 'Sch 160', wtMm: 8.74, weightKgM: 11.11 },
    ],
  },
  {
    nps: '2-1/2"',
    odMm: 73.0,
    schedules: [
      { sch: 'Sch 40', wtMm: 5.16, weightKgM: 8.63 },
      { sch: 'Sch 80', wtMm: 7.01, weightKgM: 11.41 },
      { sch: 'Sch 160', wtMm: 9.53, weightKgM: 14.92 },
    ],
  },
  {
    nps: '3"',
    odMm: 88.9,
    schedules: [
      { sch: 'Sch 40', wtMm: 5.49, weightKgM: 11.29 },
      { sch: 'Sch 80', wtMm: 7.62, weightKgM: 15.27 },
      { sch: 'Sch 160', wtMm: 11.13, weightKgM: 21.35 },
    ],
  },
  {
    nps: '3-1/2"',
    odMm: 101.6,
    schedules: [
      { sch: 'Sch 40', wtMm: 5.74, weightKgM: 13.57 },
      { sch: 'Sch 80', wtMm: 8.08, weightKgM: 18.64 },
    ],
  },
  {
    nps: '4"',
    odMm: 114.3,
    schedules: [
      { sch: 'Sch 40', wtMm: 6.02, weightKgM: 16.07 },
      { sch: 'Sch 80', wtMm: 8.56, weightKgM: 22.32 },
      { sch: 'Sch 160', wtMm: 13.49, weightKgM: 33.54 },
    ],
  },
  {
    nps: '5"',
    odMm: 141.3,
    schedules: [
      { sch: 'Sch 40', wtMm: 6.55, weightKgM: 21.77 },
      { sch: 'Sch 80', wtMm: 9.53, weightKgM: 30.94 },
      { sch: 'Sch 160', wtMm: 15.88, weightKgM: 49.11 },
    ],
  },
  {
    nps: '6"',
    odMm: 168.3,
    schedules: [
      { sch: 'Sch 40', wtMm: 7.11, weightKgM: 28.26 },
      { sch: 'Sch 80', wtMm: 10.97, weightKgM: 42.56 },
      { sch: 'Sch 160', wtMm: 18.26, weightKgM: 67.56 },
    ],
  },
  {
    nps: '8"',
    odMm: 219.1,
    schedules: [
      { sch: 'Sch 20', wtMm: 6.35, weightKgM: 33.31 },
      { sch: 'Sch 40', wtMm: 8.18, weightKgM: 42.55 },
      { sch: 'Sch 80', wtMm: 12.70, weightKgM: 64.64 },
      { sch: 'Sch 160', wtMm: 23.01, weightKgM: 111.27 },
    ],
  },
  {
    nps: '10"',
    odMm: 273.0,
    schedules: [
      { sch: 'Sch 20', wtMm: 6.35, weightKgM: 41.77 },
      { sch: 'Sch 40', wtMm: 9.27, weightKgM: 60.31 },
      { sch: 'Sch 80', wtMm: 15.09, weightKgM: 95.97 },
      { sch: 'Sch 160', wtMm: 28.58, weightKgM: 172.33 },
    ],
  },
  {
    nps: '12"',
    odMm: 323.9,
    schedules: [
      { sch: 'Sch 20', wtMm: 6.35, weightKgM: 49.73 },
      { sch: 'Sch 40', wtMm: 10.31, weightKgM: 79.73 },
      { sch: 'Sch 80', wtMm: 17.48, weightKgM: 132.08 },
    ],
  },
  {
    nps: '14"',
    odMm: 355.6,
    schedules: [
      { sch: 'Sch 30', wtMm: 9.53, weightKgM: 81.33 },
      { sch: 'Sch 40', wtMm: 11.13, weightKgM: 94.55 },
      { sch: 'Sch 80', wtMm: 19.05, weightKgM: 158.10 },
    ],
  },
  {
    nps: '16"',
    odMm: 406.4,
    schedules: [
      { sch: 'Sch 30', wtMm: 9.53, weightKgM: 93.27 },
      { sch: 'Sch 40', wtMm: 12.70, weightKgM: 123.30 },
      { sch: 'Sch 80', wtMm: 21.44, weightKgM: 203.53 },
    ],
  },
  {
    nps: '18"',
    odMm: 457.2,
    schedules: [
      { sch: 'Sch 30', wtMm: 11.13, weightKgM: 122.38 },
      { sch: 'Sch 40', wtMm: 14.27, weightKgM: 155.80 },
      { sch: 'Sch 80', wtMm: 23.83, weightKgM: 254.55 },
    ],
  },
  {
    nps: '20"',
    odMm: 508.0,
    schedules: [
      { sch: 'Sch 20', wtMm: 9.53, weightKgM: 117.15 },
      { sch: 'Sch 40', wtMm: 15.09, weightKgM: 183.42 },
      { sch: 'Sch 80', wtMm: 26.19, weightKgM: 311.18 },
    ],
  },
  {
    nps: '22"',
    odMm: 558.8,
    schedules: [
      { sch: 'Sch 20', wtMm: 9.53, weightKgM: 129.08 },
      { sch: 'Sch 40', wtMm: 15.88, weightKgM: 212.67 },
      { sch: 'Sch 80', wtMm: 28.58, weightKgM: 373.85 },
    ],
  },
  {
    nps: '24"',
    odMm: 609.6,
    schedules: [
      { sch: 'Sch 20', wtMm: 9.53, weightKgM: 141.02 },
      { sch: 'Sch 40', wtMm: 17.48, weightKgM: 255.03 },
      { sch: 'Sch 80', wtMm: 30.96, weightKgM: 441.50 },
    ],
  },
];

export interface ProfileStandard {
  name: string;
  size: string;
  weightKgM: number; // kg/m
  dimensions?: string;
  angleType?: 'equal' | 'unequal';
}

export const STANDARD_HBEAMS: ProfileStandard[] = [
  { name: 'H-Beam 100x100', size: '100x100x6x8', weightKgM: 17.2, dimensions: 'H:100 B:100 t1:6 t2:8' },
  { name: 'H-Beam 125x125', size: '125x125x6.5x9', weightKgM: 23.8, dimensions: 'H:125 B:125 t1:6.5 t2:9' },
  { name: 'H-Beam 150x150', size: '150x150x7x10', weightKgM: 31.5, dimensions: 'H:150 B:150 t1:7 t2:10' },
  { name: 'H-Beam 175x175', size: '175x175x7.5x11', weightKgM: 40.2, dimensions: 'H:175 B:175 t1:7.5 t2:11' },
  { name: 'H-Beam 200x200', size: '200x200x8x12', weightKgM: 49.9, dimensions: 'H:200 B:200 t1:8 t2:12' },
  { name: 'H-Beam 250x250', size: '250x250x9x14', weightKgM: 72.4, dimensions: 'H:250 B:250 t1:9 t2:14' },
  { name: 'H-Beam 300x300', size: '300x300x10x15', weightKgM: 94.0, dimensions: 'H:300 B:300 t1:10 t2:15' },
  { name: 'H-Beam 350x350', size: '350x350x12x19', weightKgM: 137.0, dimensions: 'H:350 B:350 t1:12 t2:19' },
  { name: 'H-Beam 400x400', size: '400x400x13x21', weightKgM: 172.0, dimensions: 'H:400 B:400 t1:13 t2:21' },
  // WF (Wide Flange)
  { name: 'WF 100x50', size: '100x50x5x7', weightKgM: 9.3, dimensions: 'H:100 B:50 t1:5 t2:7' },
  { name: 'WF 150x75', size: '150x75x5x7', weightKgM: 14.0, dimensions: 'H:150 B:75 t1:5 t2:7' },
  { name: 'WF 200x100', size: '200x100x5.5x8', weightKgM: 21.3, dimensions: 'H:200 B:100 t1:5.5 t2:8' },
  { name: 'WF 250x125', size: '250x125x6x9', weightKgM: 29.6, dimensions: 'H:250 B:125 t1:6 t2:9' },
  { name: 'WF 300x150', size: '300x150x6.5x9', weightKgM: 36.7, dimensions: 'H:300 B:150 t1:6.5 t2:9' },
  { name: 'WF 350x175', size: '350x175x7x11', weightKgM: 49.6, dimensions: 'H:350 B:175 t1:7 t2:11' },
  { name: 'WF 400x200', size: '400x200x8x13', weightKgM: 66.0, dimensions: 'H:400 B:200 t1:8 t2:13' },
];

/** Besi Siku Sama Sisi (Equal Angle Bar) */
export const STANDARD_EQUAL_ANGLES: ProfileStandard[] = [
  { name: 'L 20x20x3', size: '20x20x3', weightKgM: 0.88, dimensions: 'A:20 B:20 t:3', angleType: 'equal' },
  { name: 'L 25x25x3', size: '25x25x3', weightKgM: 1.12, dimensions: 'A:25 B:25 t:3', angleType: 'equal' },
  { name: 'L 25x25x4', size: '25x25x4', weightKgM: 1.45, dimensions: 'A:25 B:25 t:4', angleType: 'equal' },
  { name: 'L 30x30x3', size: '30x30x3', weightKgM: 1.36, dimensions: 'A:30 B:30 t:3', angleType: 'equal' },
  { name: 'L 30x30x4', size: '30x30x4', weightKgM: 1.78, dimensions: 'A:30 B:30 t:4', angleType: 'equal' },
  { name: 'L 40x40x3', size: '40x40x3', weightKgM: 1.83, dimensions: 'A:40 B:40 t:3', angleType: 'equal' },
  { name: 'L 40x40x4', size: '40x40x4', weightKgM: 2.42, dimensions: 'A:40 B:40 t:4', angleType: 'equal' },
  { name: 'L 40x40x5', size: '40x40x5', weightKgM: 2.97, dimensions: 'A:40 B:40 t:5', angleType: 'equal' },
  { name: 'L 45x45x4', size: '45x45x4', weightKgM: 2.74, dimensions: 'A:45 B:45 t:4', angleType: 'equal' },
  { name: 'L 45x45x5', size: '45x45x5', weightKgM: 3.38, dimensions: 'A:45 B:45 t:5', angleType: 'equal' },
  { name: 'L 50x50x4', size: '50x50x4', weightKgM: 3.06, dimensions: 'A:50 B:50 t:4', angleType: 'equal' },
  { name: 'L 50x50x5', size: '50x50x5', weightKgM: 3.77, dimensions: 'A:50 B:50 t:5', angleType: 'equal' },
  { name: 'L 50x50x6', size: '50x50x6', weightKgM: 4.47, dimensions: 'A:50 B:50 t:6', angleType: 'equal' },
  { name: 'L 60x60x5', size: '60x60x5', weightKgM: 4.57, dimensions: 'A:60 B:60 t:5', angleType: 'equal' },
  { name: 'L 60x60x6', size: '60x60x6', weightKgM: 5.42, dimensions: 'A:60 B:60 t:6', angleType: 'equal' },
  { name: 'L 65x65x6', size: '65x65x6', weightKgM: 5.91, dimensions: 'A:65 B:65 t:6', angleType: 'equal' },
  { name: 'L 65x65x8', size: '65x65x8', weightKgM: 7.73, dimensions: 'A:65 B:65 t:8', angleType: 'equal' },
  { name: 'L 70x70x6', size: '70x70x6', weightKgM: 6.38, dimensions: 'A:70 B:70 t:6', angleType: 'equal' },
  { name: 'L 70x70x7', size: '70x70x7', weightKgM: 7.38, dimensions: 'A:70 B:70 t:7', angleType: 'equal' },
  { name: 'L 75x75x6', size: '75x75x6', weightKgM: 6.85, dimensions: 'A:75 B:75 t:6', angleType: 'equal' },
  { name: 'L 75x75x9', size: '75x75x9', weightKgM: 9.96, dimensions: 'A:75 B:75 t:9', angleType: 'equal' },
  { name: 'L 80x80x7', size: '80x80x7', weightKgM: 8.49, dimensions: 'A:80 B:80 t:7', angleType: 'equal' },
  { name: 'L 80x80x8', size: '80x80x8', weightKgM: 9.66, dimensions: 'A:80 B:80 t:8', angleType: 'equal' },
  { name: 'L 90x90x7', size: '90x90x7', weightKgM: 9.61, dimensions: 'A:90 B:90 t:7', angleType: 'equal' },
  { name: 'L 90x90x9', size: '90x90x9', weightKgM: 12.20, dimensions: 'A:90 B:90 t:9', angleType: 'equal' },
  { name: 'L 90x90x10', size: '90x90x10', weightKgM: 13.40, dimensions: 'A:90 B:90 t:10', angleType: 'equal' },
  { name: 'L 100x100x7', size: '100x100x7', weightKgM: 10.70, dimensions: 'A:100 B:100 t:7', angleType: 'equal' },
  { name: 'L 100x100x10', size: '100x100x10', weightKgM: 15.00, dimensions: 'A:100 B:100 t:10', angleType: 'equal' },
  { name: 'L 100x100x12', size: '100x100x12', weightKgM: 17.80, dimensions: 'A:100 B:100 t:12', angleType: 'equal' },
  { name: 'L 120x120x8', size: '120x120x8', weightKgM: 14.70, dimensions: 'A:120 B:120 t:8', angleType: 'equal' },
  { name: 'L 120x120x12', size: '120x120x12', weightKgM: 21.60, dimensions: 'A:120 B:120 t:12', angleType: 'equal' },
  { name: 'L 130x130x9', size: '130x130x9', weightKgM: 17.90, dimensions: 'A:130 B:130 t:9', angleType: 'equal' },
  { name: 'L 130x130x12', size: '130x130x12', weightKgM: 23.60, dimensions: 'A:130 B:130 t:12', angleType: 'equal' },
  { name: 'L 150x150x10', size: '150x150x10', weightKgM: 23.00, dimensions: 'A:150 B:150 t:10', angleType: 'equal' },
  { name: 'L 150x150x12', size: '150x150x12', weightKgM: 27.30, dimensions: 'A:150 B:150 t:12', angleType: 'equal' },
  { name: 'L 150x150x15', size: '150x150x15', weightKgM: 33.80, dimensions: 'A:150 B:150 t:15', angleType: 'equal' },
  { name: 'L 175x175x12', size: '175x175x12', weightKgM: 31.80, dimensions: 'A:175 B:175 t:12', angleType: 'equal' },
  { name: 'L 175x175x15', size: '175x175x15', weightKgM: 39.40, dimensions: 'A:175 B:175 t:15', angleType: 'equal' },
  { name: 'L 200x200x15', size: '200x200x15', weightKgM: 45.30, dimensions: 'A:200 B:200 t:15', angleType: 'equal' },
  { name: 'L 200x200x20', size: '200x200x20', weightKgM: 59.70, dimensions: 'A:200 B:200 t:20', angleType: 'equal' },
  { name: 'L 250x250x25', size: '250x250x25', weightKgM: 93.60, dimensions: 'A:250 B:250 t:25', angleType: 'equal' },
];

/** Besi Siku Tidak Sama Sisi (Unequal Angle Bar / Siku Beda Sisi) */
export const STANDARD_UNEQUAL_ANGLES: ProfileStandard[] = [
  { name: 'L 50x30x4 (Unequal)', size: '50x30x4', weightKgM: 2.41, dimensions: 'A:50 B:30 t:4', angleType: 'unequal' },
  { name: 'L 60x40x5 (Unequal)', size: '60x40x5', weightKgM: 3.76, dimensions: 'A:60 B:40 t:5', angleType: 'unequal' },
  { name: 'L 65x50x5 (Unequal)', size: '65x50x5', weightKgM: 4.35, dimensions: 'A:65 B:50 t:5', angleType: 'unequal' },
  { name: 'L 75x50x5 (Unequal)', size: '75x50x5', weightKgM: 4.74, dimensions: 'A:75 B:50 t:5', angleType: 'unequal' },
  { name: 'L 75x50x6 (Unequal)', size: '75x50x6', weightKgM: 5.62, dimensions: 'A:75 B:50 t:6', angleType: 'unequal' },
  { name: 'L 90x60x6 (Unequal)', size: '90x60x6', weightKgM: 6.82, dimensions: 'A:90 B:60 t:6', angleType: 'unequal' },
  { name: 'L 100x50x6 (Unequal)', size: '100x50x6', weightKgM: 6.85, dimensions: 'A:100 B:50 t:6', angleType: 'unequal' },
  { name: 'L 100x75x7 (Unequal)', size: '100x75x7', weightKgM: 9.32, dimensions: 'A:100 B:75 t:7', angleType: 'unequal' },
  { name: 'L 100x75x10 (Unequal)', size: '100x75x10', weightKgM: 13.00, dimensions: 'A:100 B:75 t:10', angleType: 'unequal' },
  { name: 'L 125x75x7 (Unequal)', size: '125x75x7', weightKgM: 10.70, dimensions: 'A:125 B:75 t:7', angleType: 'unequal' },
  { name: 'L 125x75x10 (Unequal)', size: '125x75x10', weightKgM: 14.90, dimensions: 'A:125 B:75 t:10', angleType: 'unequal' },
  { name: 'L 125x90x10 (Unequal)', size: '125x90x10', weightKgM: 16.10, dimensions: 'A:125 B:90 t:10', angleType: 'unequal' },
  { name: 'L 150x90x9 (Unequal)', size: '150x90x9', weightKgM: 16.40, dimensions: 'A:150 B:90 t:9', angleType: 'unequal' },
  { name: 'L 150x90x12 (Unequal)', size: '150x90x12', weightKgM: 21.60, dimensions: 'A:150 B:90 t:12', angleType: 'unequal' },
  { name: 'L 150x100x10 (Unequal)', size: '150x100x10', weightKgM: 19.00, dimensions: 'A:150 B:100 t:10', angleType: 'unequal' },
  { name: 'L 150x100x12 (Unequal)', size: '150x100x12', weightKgM: 22.50, dimensions: 'A:150 B:100 t:12', angleType: 'unequal' },
  { name: 'L 200x100x10 (Unequal)', size: '200x100x10', weightKgM: 23.00, dimensions: 'A:200 B:100 t:10', angleType: 'unequal' },
  { name: 'L 200x100x12 (Unequal)', size: '200x100x12', weightKgM: 27.30, dimensions: 'A:200 B:100 t:12', angleType: 'unequal' },
  { name: 'L 200x150x12 (Unequal)', size: '200x150x12', weightKgM: 32.00, dimensions: 'A:200 B:150 t:12', angleType: 'unequal' },
  { name: 'L 200x150x15 (Unequal)', size: '200x150x15', weightKgM: 39.60, dimensions: 'A:200 B:150 t:15', angleType: 'unequal' },
];

export const STANDARD_ANGLES: ProfileStandard[] = [
  ...STANDARD_EQUAL_ANGLES,
  ...STANDARD_UNEQUAL_ANGLES,
];

export const STANDARD_FLATBARS: ProfileStandard[] = [
  { name: 'FB 25x3', size: '25x3', weightKgM: 0.59, dimensions: 'W:25 t:3' },
  { name: 'FB 30x4', size: '30x4', weightKgM: 0.94, dimensions: 'W:30 t:4' },
  { name: 'FB 40x5', size: '40x5', weightKgM: 1.57, dimensions: 'W:40 t:5' },
  { name: 'FB 50x4.5', size: '50x4.5', weightKgM: 1.77, dimensions: 'W:50 t:4.5' },
  { name: 'FB 50x6', size: '50x6', weightKgM: 2.36, dimensions: 'W:50 t:6' },
  { name: 'FB 65x8', size: '65x8', weightKgM: 4.08, dimensions: 'W:65 t:8' },
  { name: 'FB 75x10', size: '75x10', weightKgM: 5.89, dimensions: 'W:75 t:10' },
  { name: 'FB 75x12', size: '75x12', weightKgM: 7.07, dimensions: 'W:75 t:12' },
  { name: 'FB 100x10', size: '100x10', weightKgM: 7.85, dimensions: 'W:100 t:10' },
  { name: 'FB 100x12', size: '100x12', weightKgM: 9.42, dimensions: 'W:100 t:12' },
  { name: 'FB 125x12', size: '125x12', weightKgM: 11.78, dimensions: 'W:125 t:12' },
  { name: 'FB 150x15', size: '150x15', weightKgM: 17.66, dimensions: 'W:150 t:15' },
  { name: 'FB 200x20', size: '200x20', weightKgM: 31.40, dimensions: 'W:200 t:20' },
];

export const STANDARD_BULB_FLATS: ProfileStandard[] = [
  { name: 'HP 80x5', size: '80x5', weightKgM: 3.54, dimensions: 'H:80 t:5' },
  { name: 'HP 100x6', size: '100x6', weightKgM: 5.33, dimensions: 'H:100 t:6' },
  { name: 'HP 120x7', size: '120x7', weightKgM: 7.56, dimensions: 'H:120 t:7' },
  { name: 'HP 140x7', size: '140x7', weightKgM: 8.84, dimensions: 'H:140 t:7' },
  { name: 'HP 160x8', size: '160x8', weightKgM: 11.80, dimensions: 'H:160 t:8' },
  { name: 'HP 180x9', size: '180x9', weightKgM: 15.10, dimensions: 'H:180 t:9' },
  { name: 'HP 200x10', size: '200x10', weightKgM: 19.00, dimensions: 'H:200 t:10' },
  { name: 'HP 220x11', size: '220x11', weightKgM: 23.50, dimensions: 'H:220 t:11' },
  { name: 'HP 240x12', size: '240x12', weightKgM: 28.70, dimensions: 'H:240 t:12' },
  { name: 'HP 260x12', size: '260x12', weightKgM: 31.80, dimensions: 'H:260 t:12' },
];

export const STANDARD_ROUNDBARS: ProfileStandard[] = [
  { name: 'Round Bar D 10mm', size: 'D 10', weightKgM: 0.62, dimensions: 'Dia:10mm' },
  { name: 'Round Bar D 12mm', size: 'D 12', weightKgM: 0.89, dimensions: 'Dia:12mm' },
  { name: 'Round Bar D 16mm', size: 'D 16', weightKgM: 1.58, dimensions: 'Dia:16mm' },
  { name: 'Round Bar D 19mm', size: 'D 19', weightKgM: 2.23, dimensions: 'Dia:19mm' },
  { name: 'Round Bar D 22mm', size: 'D 22', weightKgM: 2.98, dimensions: 'Dia:22mm' },
  { name: 'Round Bar D 25mm (1")', size: 'D 25', weightKgM: 3.85, dimensions: 'Dia:25mm' },
  { name: 'Round Bar D 32mm', size: 'D 32', weightKgM: 6.31, dimensions: 'Dia:32mm' },
  { name: 'Round Bar D 38mm (1-1/2")', size: 'D 38', weightKgM: 8.90, dimensions: 'Dia:38mm' },
  { name: 'Round Bar D 50mm (2")', size: 'D 50', weightKgM: 15.41, dimensions: 'Dia:50mm' },
  { name: 'Round Bar D 65mm', size: 'D 65', weightKgM: 26.05, dimensions: 'Dia:65mm' },
  { name: 'Round Bar D 75mm (3")', size: 'D 75', weightKgM: 34.68, dimensions: 'Dia:75mm' },
  { name: 'Round Bar D 100mm (4")', size: 'D 100', weightKgM: 61.65, dimensions: 'Dia:100mm' },
  { name: 'Round Bar D 125mm (5")', size: 'D 125', weightKgM: 96.33, dimensions: 'Dia:125mm' },
  { name: 'Round Bar D 150mm (6")', size: 'D 150', weightKgM: 138.72, dimensions: 'Dia:150mm' },
];

export const STANDARD_SQUAREBARS: ProfileStandard[] = [
  { name: 'Square Bar 10x10', size: '10x10', weightKgM: 0.79, dimensions: 'S:10mm' },
  { name: 'Square Bar 12x12', size: '12x12', weightKgM: 1.13, dimensions: 'S:12mm' },
  { name: 'Square Bar 16x16', size: '16x16', weightKgM: 2.01, dimensions: 'S:16mm' },
  { name: 'Square Bar 19x19', size: '19x19', weightKgM: 2.83, dimensions: 'S:19mm' },
  { name: 'Square Bar 22x22', size: '22x22', weightKgM: 3.80, dimensions: 'S:22mm' },
  { name: 'Square Bar 25x25 (1")', size: '25x25', weightKgM: 4.91, dimensions: 'S:25mm' },
  { name: 'Square Bar 32x32', size: '32x32', weightKgM: 8.04, dimensions: 'S:32mm' },
  { name: 'Square Bar 50x50 (2")', size: '50x50', weightKgM: 19.63, dimensions: 'S:50mm' },
];

export const STANDARD_GRATINGS = [
  { name: 'Grating 25x3 mm (Serrated)', size: '25x3', weightKgM2: 24.5, description: 'Catwalk & Light walkway' },
  { name: 'Grating 25x5 mm (Standard Engine Room)', size: '25x5', weightKgM2: 38.8, description: 'Engine room flooring & bilges' },
  { name: 'Grating 32x3 mm', size: '32x3', weightKgM2: 30.5, description: 'Heavy pedestrian walkway' },
  { name: 'Grating 32x5 mm (Heavy Duty)', size: '32x5', weightKgM2: 47.5, description: 'Main engine floor & pump room' },
  { name: 'Grating 38x5 mm (Extra Heavy)', size: '38x5', weightKgM2: 55.8, description: 'Heavy machinery platform' },
  { name: 'Grating 50x5 mm (Industrial)', size: '50x5', weightKgM2: 72.5, description: 'Vehicular / Cargo deck loading' },
];

export const STANDARD_BORDES = [
  { name: 'Plat Bordes 2.3 mm', thicknessMm: 2.3, weightKgM2: 19.70, description: 'Deck floor ringan' },
  { name: 'Plat Bordes 3.0 mm', thicknessMm: 3.0, weightKgM2: 25.20, description: 'Gangway & tangga kapal' },
  { name: 'Plat Bordes 3.2 mm (Standard Geladak)', thicknessMm: 3.2, weightKgM2: 26.80, description: 'Lantai geladak & kamar mesin' },
  { name: 'Plat Bordes 4.5 mm (Heavy Deck)', thicknessMm: 4.5, weightKgM2: 37.00, description: 'Main deck walkway & kerja' },
  { name: 'Plat Bordes 6.0 mm (Heavy Cargo)', thicknessMm: 6.0, weightKgM2: 48.80, description: 'Loading deck / rampa' },
  { name: 'Plat Bordes 8.0 mm', thicknessMm: 8.0, weightKgM2: 64.50, description: 'Trolley / Forklift path' },
  { name: 'Plat Bordes 9.0 mm', thicknessMm: 9.0, weightKgM2: 72.30, description: 'Ramp door deck' },
  { name: 'Plat Bordes 12.0 mm', thicknessMm: 12.0, weightKgM2: 95.80, description: 'Extreme load deck' },
];

export const STANDARD_CHANNELS: ProfileStandard[] = [
  { name: 'UNP 50x38x5', size: '50x38x5', weightKgM: 5.44, dimensions: 'H:50 B:38 t:5' },
  { name: 'UNP 65x42x5.5', size: '65x42x5.5', weightKgM: 7.09, dimensions: 'H:65 B:42 t:5.5' },
  { name: 'UNP 80x45x6', size: '80x45x6', weightKgM: 8.64, dimensions: 'H:80 B:45 t:6' },
  { name: 'UNP 100x50x5', size: '100x50x5', weightKgM: 9.36, dimensions: 'H:100 B:50 t:5' },
  { name: 'UNP 120x55x7', size: '120x55x7', weightKgM: 13.40, dimensions: 'H:120 B:55 t:7' },
  { name: 'UNP 150x75x6.5', size: '150x75x6.5', weightKgM: 18.60, dimensions: 'H:150 B:75 t:6.5' },
  { name: 'UNP 200x80x7.5', size: '200x80x7.5', weightKgM: 24.60, dimensions: 'H:200 B:80 t:7.5' },
  { name: 'UNP 250x90x9', size: '250x90x9', weightKgM: 34.60, dimensions: 'H:250 B:90 t:9' },
  { name: 'UNP 300x90x9', size: '300x90x9', weightKgM: 38.10, dimensions: 'H:300 B:90 t:9' },
];

export class TonnageCalculator {
  static readonly STEEL_DENSITY = 7.85; // kg/dm³ or kg/(m²*mm)
  static readonly STAINLESS_DENSITY = 7.93; // kg/dm³

  /**
   * Hitung berat pelat baja (kg):
   * Length in meters, Width in meters, Thickness in mm.
   */
  static calculatePlateWeight(params: {
    length: number; // meters
    width: number; // meters
    thickness: number; // mm
    density?: number;
    qty?: number;
  }): number {
    const { length, width, thickness, density = TonnageCalculator.STEEL_DENSITY, qty = 1 } = params;
    if (length <= 0 || width <= 0 || thickness <= 0) return 0;
    const weight = length * width * thickness * density * qty;
    return Math.round(weight * 100) / 100;
  }

  /**
   * Hitung berat pelat dari dimensi mm:
   */
  static calculatePlateWeightFromMm(params: {
    lengthMm: number;
    widthMm: number;
    thicknessMm: number;
    qty?: number;
    density?: number;
  }): number {
    const { lengthMm, widthMm, thicknessMm, qty = 1, density = TonnageCalculator.STEEL_DENSITY } = params;
    if (lengthMm <= 0 || widthMm <= 0 || thicknessMm <= 0) return 0;
    const weightOne = (lengthMm / 1000) * (widthMm / 1000) * thicknessMm * density;
    return Math.round(weightOne * qty * 100) / 100;
  }

  /**
   * Hitung berat pipa baja (kg) berdasarkan OD (mm), ketebalan WT (mm), dan panjang (m):
   * Rumus standar: (OD - WT) * WT * 0.02466 * Panjang(m) * Qty
   */
  static calculatePipeWeight(params: {
    outerDiameterMm: number;
    wallThicknessMm: number;
    lengthM: number;
    qty?: number;
  }): number {
    const { outerDiameterMm, wallThicknessMm, lengthM, qty = 1 } = params;
    if (outerDiameterMm <= 0 || wallThicknessMm <= 0 || lengthM <= 0) return 0;
    const weightPerMeter = (outerDiameterMm - wallThicknessMm) * wallThicknessMm * 0.0246615;
    return Math.round(weightPerMeter * lengthM * qty * 100) / 100;
  }

  /**
   * Hitung berat H-Beam / WF (kg) dari berat per meter atau rumus dimensi:
   */
  static calculateHBeamWeight(params: {
    weightKgM?: number;
    heightMm?: number;
    widthMm?: number;
    webThicknessMm?: number;
    flangeThicknessMm?: number;
    lengthM: number;
    qty?: number;
  }): number {
    const { weightKgM, heightMm, widthMm, webThicknessMm, flangeThicknessMm, lengthM, qty = 1 } = params;
    if (lengthM <= 0) return 0;

    let kgM = weightKgM;
    if (!kgM && heightMm && widthMm && webThicknessMm && flangeThicknessMm) {
      // Area = 2 * (width * flange) + (height - 2*flange) * web
      const flangeArea = 2 * (widthMm * flangeThicknessMm);
      const webArea = (heightMm - 2 * flangeThicknessMm) * webThicknessMm;
      const totalAreaMm2 = flangeArea + webArea;
      kgM = (totalAreaMm2 / 1000000) * 1 * 7850;
    }

    if (!kgM || kgM <= 0) return 0;
    return Math.round(kgM * lengthM * qty * 100) / 100;
  }

  /**
   * Hitung berat Angle Bar / Besi Siku (kg):
   * Rumus: ((A + B - t) * t * 0.00785) * Length(m) * Qty
   */
  static calculateAngleBarWeight(params: {
    weightKgM?: number;
    legAMm?: number;
    legBMm?: number;
    thicknessMm?: number;
    lengthM: number;
    qty?: number;
  }): number {
    const { weightKgM, legAMm, legBMm, thicknessMm, lengthM, qty = 1 } = params;
    if (lengthM <= 0) return 0;

    let kgM = weightKgM;
    if (!kgM && legAMm && legBMm && thicknessMm) {
      kgM = (legAMm + legBMm - thicknessMm) * thicknessMm * 0.00785;
    }

    if (!kgM || kgM <= 0) return 0;
    return Math.round(kgM * lengthM * qty * 100) / 100;
  }

  /**
   * Hitung berat Flat Bar / Strip (kg):
   * Rumus: Width(mm) * Thickness(mm) * 0.00785 * Length(m) * Qty
   */
  static calculateFlatBarWeight(params: {
    widthMm: number;
    thicknessMm: number;
    lengthM: number;
    qty?: number;
  }): number {
    const { widthMm, thicknessMm, lengthM, qty = 1 } = params;
    if (widthMm <= 0 || thicknessMm <= 0 || lengthM <= 0) return 0;
    const kgM = widthMm * thicknessMm * 0.00785;
    return Math.round(kgM * lengthM * qty * 100) / 100;
  }

  /**
   * Hitung berat Round Bar / Besi As (kg):
   * Rumus: 0.006165 * Diameter(mm)² * Length(m) * Qty
   */
  static calculateRoundBarWeight(params: {
    diameterMm: number;
    lengthM: number;
    qty?: number;
  }): number {
    const { diameterMm, lengthM, qty = 1 } = params;
    if (diameterMm <= 0 || lengthM <= 0) return 0;
    const kgM = 0.006165 * diameterMm * diameterMm;
    return Math.round(kgM * lengthM * qty * 100) / 100;
  }

  /**
   * Hitung berat Square Bar / Besi Nako (kg):
   * Rumus: Side(mm)² * 0.00785 * Length(m) * Qty
   */
  static calculateSquareBarWeight(params: {
    sideMm: number;
    lengthM: number;
    qty?: number;
  }): number {
    const { sideMm, lengthM, qty = 1 } = params;
    if (sideMm <= 0 || lengthM <= 0) return 0;
    const kgM = sideMm * sideMm * 0.00785;
    return Math.round(kgM * lengthM * qty * 100) / 100;
  }

  /**
   * Hitung berat Grating Plate (kg):
   * Area(m²) * kg/m² * Qty
   */
  static calculateGratingWeight(params: {
    lengthM: number;
    widthM: number;
    weightKgM2: number;
    qty?: number;
  }): number {
    const { lengthM, widthM, weightKgM2, qty = 1 } = params;
    if (lengthM <= 0 || widthM <= 0 || weightKgM2 <= 0) return 0;
    const total = lengthM * widthM * weightKgM2 * qty;
    return Math.round(total * 100) / 100;
  }

  /**
   * Hitung berat Plat Bordes / Chequered Plate (kg):
   * Standard density + kembang pattern or specific kg/m² table
   */
  static calculateBordesWeight(params: {
    lengthM: number;
    widthM: number;
    thicknessMm?: number;
    weightKgM2?: number;
    qty?: number;
  }): number {
    const { lengthM, widthM, thicknessMm, weightKgM2, qty = 1 } = params;
    if (lengthM <= 0 || widthM <= 0) return 0;

    let kgM2 = weightKgM2;
    if (!kgM2 && thicknessMm) {
      // Find closest in table or calculate: (thickness * 7.85) + 1.8 kg/m² diamond pattern
      const match = STANDARD_BORDES.find((b) => Math.abs(b.thicknessMm - thicknessMm) < 0.2);
      if (match) {
        kgM2 = match.weightKgM2;
      } else {
        kgM2 = thicknessMm * 7.85 + 1.85;
      }
    }

    if (!kgM2 || kgM2 <= 0) return 0;
    const total = lengthM * widthM * kgM2 * qty;
    return Math.round(total * 100) / 100;
  }

  /**
   * Hitung berat Channel Bar / UNP (kg):
   */
  static calculateChannelWeight(params: {
    weightKgM: number;
    lengthM: number;
    qty?: number;
  }): number {
    const { weightKgM, lengthM, qty = 1 } = params;
    if (weightKgM <= 0 || lengthM <= 0) return 0;
    return Math.round(weightKgM * lengthM * qty * 100) / 100;
  }

  /**
   * Kalkulasi otomatis komprehensif Tonase (kg & Ton) dan Total Harga (Rp)
   * Sinkron dengan Katalog Material Galangan.
   */
  static calculateItemTonnageAndPrice(params: {
    typeCode?: string | number;
    category?: MaterialCategory | string;
    d1?: string | number;
    d2?: string | number;
    d3?: string | number;
    dLen?: string | number;
    d4?: string | number;
    qty?: number;
    unit?: string;
    unitPrice?: number;
    priceBasis?: 'qty' | 'weight';
  }): {
    weightKg: number;
    weightTon: number;
    formattedWeight: string;
    unitPrice: number;
    totalPrice: number;
    formattedTotalPrice: string;
    unit: string;
    materialDef?: MaterialTypeDefinition;
  } {
    const code = String(params?.typeCode ?? '').trim();
    const upperCode = code.toUpperCase();
    const matDef = this.getMaterialType(code);

    const parseVal = (val: string | number | undefined, defaultVal?: string | number): number => {
      if (val !== undefined && val !== null && val !== '') {
        const cleaned = String(val).replace(/,/g, '.').trim();
        const num = parseFloat(cleaned);
        if (!isNaN(num)) return num;
      }
      if (defaultVal !== undefined && defaultVal !== null && defaultVal !== '') {
        const cleaned = String(defaultVal).replace(/,/g, '.').trim();
        const num = parseFloat(cleaned);
        if (!isNaN(num)) return num;
      }
      return 0;
    };

    const d1Str = String(params.d1 ?? '').trim();
    const d2Str = String(params.d2 ?? '').trim();
    const d3Str = String(params.d3 ?? '').trim();
    const dLenStr = String(params.dLen ?? '').trim();
    const d4Str = String(params.d4 ?? '').trim();

    const d1Num = parseVal(params.d1, matDef?.defaultD1);
    const d2Num = parseVal(params.d2, matDef?.defaultD2);
    const d3Num = parseVal(params.d3, matDef?.defaultD3);
    const dLenNum = parseVal(params.dLen, matDef?.defaultDLen);
    const d4Num = parseVal(params.d4, matDef?.defaultD4);

    const unit = params.unit || matDef?.defaultUnit || 'kg';
    const unitStrClean = String(unit).trim().toLowerCase();
    const isMeterUnit = unitStrClean === 'm' || unitStrClean === 'meter';

    let qty = params.qty;
    if (isMeterUnit && dLenNum > 0) {
      const d4Val = d4Num > 0 ? d4Num : 1;
      qty = Math.round(((dLenNum / 1000) * d4Val) * 1000) / 1000;
    } else if (qty === undefined || qty <= 0) {
      qty = d4Num > 0 ? d4Num : 1;
    }
    const unitPrice =
      params.unitPrice !== undefined && params.unitPrice > 0
        ? params.unitPrice
        : matDef?.defaultUnitPrice || 48000;

    let weightKg = 0;

    // 1. PELAT / PLATE (PL, PL ABS, PL BKI, PL NC, PL MS, PL SS, PLATE, PELAT)
    const isPlate =
      upperCode.startsWith('PL') ||
      upperCode.includes('PLATE') ||
      upperCode.includes('PELAT') ||
      matDef?.category === 'plate';

    // 2. CHEQUERED PLATE / BORDES (CQR, BORDES, CHEQUER)
    const isChequered =
      upperCode.startsWith('CQR') ||
      upperCode.includes('BORDES') ||
      upperCode.includes('CHEQUER') ||
      (matDef?.category as string) === 'bordes';

    // 3. STEEL GRATING (GR, GRATING)
    const isGrating =
      upperCode.startsWith('GR') ||
      upperCode.includes('GRATING') ||
      (matDef?.category as string) === 'grating';

    // 4. PIPE (PP-B, PP-G, PP, PIPE, PIPA)
    const isPipe =
      upperCode.startsWith('PP') ||
      upperCode.startsWith('PIPE') ||
      upperCode.startsWith('PIPA') ||
      matDef?.category === 'pipe';

    // 5. ROUND BAR (RB MM, RB IN, RB, ROUND BAR, AS BULAT)
    const isRoundBar =
      upperCode.startsWith('RB') ||
      upperCode.startsWith('ROUND') ||
      upperCode.startsWith('AS ') ||
      upperCode.includes('ROUND BAR');

    // 6. FLAT BAR (FB, FLAT BAR, FLATBAR)
    const isFlatBar =
      upperCode === 'FB' ||
      upperCode.startsWith('FB ') ||
      upperCode.startsWith('FB-') ||
      upperCode.includes('FLAT') ||
      upperCode.includes('FLATBAR');

    // 7. UNEQUAL ANGLE (UA, UNEQUAL ANGLE, SIKU BEDA SISI)
    const isUnequalAngle =
      upperCode.startsWith('UA') ||
      upperCode.includes('UNEQUAL') ||
      upperCode.includes('BEDA SISI');

    // 8. EQUAL ANGLE (EA, L-ANGLE, SIKU SAMA SISI, L )
    const isEqualAngle =
      !isUnequalAngle &&
      (upperCode === 'EA' ||
        upperCode.startsWith('EA ') ||
        upperCode.startsWith('EA-') ||
        upperCode.startsWith('L ') ||
        upperCode.startsWith('L-') ||
        upperCode.includes('EQUAL') ||
        upperCode.includes('SIKU'));

    // 9. SQUARE BAR (SB, SQUARE BAR, KOTAK SOLID)
    const isSquareBar =
      upperCode === 'SB' ||
      upperCode.startsWith('SB ') ||
      upperCode.startsWith('SB-') ||
      upperCode.includes('SQUARE') ||
      upperCode.includes('KOTAK');

    // 10. H-BEAM (HB, H-BEAM, H BEAM)
    const isHBeam =
      upperCode.startsWith('HB') ||
      upperCode.startsWith('H-BEAM') ||
      upperCode.startsWith('H BEAM') ||
      upperCode === 'HB';

    // 11. WIDE FLANGE (WF, WIDE FLANGE)
    const isWF =
      upperCode.startsWith('WF') ||
      upperCode.includes('WIDE FLANGE');

    // 12. UNP / CHANNEL (UNP, UPN, KANAL U, CHANNEL)
    const isUNP =
      upperCode.startsWith('UNP') ||
      upperCode.startsWith('UPN') ||
      upperCode.includes('KANAL U') ||
      upperCode.includes('CHANNEL');

    // Order of checks: prioritize specific profiles, piping, bars, gratings, chequered, angles first, then plate fallback
    if (isPipe) {
      const lenMm = dLenNum > 0 ? dLenNum : (d1Num > 100 ? d1Num : 6000);
      const lenM = lenMm / 1000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);

      // Standard Pipe lookup database by Nominal Pipe Size (inch) and Schedule
      const pipeLookup: Record<string, Record<string, number>> = {
        '1/8': { sch40: 0.37, sch80: 0.47 },
        '1/4': { sch40: 0.63, sch80: 0.80 },
        '3/8': { sch40: 0.85, sch80: 1.10 },
        '1/2': { sch40: 1.27, sch80: 1.62, sch160: 2.54 },
        '3/4': { sch40: 1.69, sch80: 2.20, sch160: 3.64 },
        '1': { sch40: 2.50, sch80: 3.24, sch160: 5.45 },
        '1-1/4': { sch40: 3.39, sch80: 4.47, sch160: 7.42 },
        '1-1/2': { sch40: 4.05, sch80: 5.41, sch160: 9.54 },
        '2': { sch40: 5.44, sch80: 7.48, sch160: 14.81 },
        '2-1/2': { sch40: 8.63, sch80: 11.41, sch160: 20.30 },
        '3': { sch40: 11.29, sch80: 15.27, sch160: 21.35 },
        '3-1/2': { sch40: 13.57, sch80: 18.64 },
        '4': { sch40: 16.07, sch80: 22.32, sch160: 33.54 },
        '5': { sch40: 21.77, sch80: 30.94, sch160: 49.11 },
        '6': { sch40: 28.26, sch80: 42.56, sch160: 67.56 },
        '8': { sch40: 42.55, sch80: 64.64, sch160: 111.27 },
        '10': { sch40: 60.31, sch80: 81.55, sch160: 160.27 },
        '12': { sch40: 73.84, sch80: 107.39, sch160: 205.66 },
        '14': { sch40: 79.99, sch80: 122.08 },
        '16': { sch40: 93.27, sch80: 142.68 },
        '18': { sch40: 105.16, sch80: 164.71 },
        '20': { sch40: 117.06, sch80: 188.08 },
        '24': { sch40: 140.87, sch80: 238.35 },
      };

      // Clean NPS string
      const npsClean = d1Str.replace(/["']/g, '').trim();
      // Clean schedule string
      let schClean = d3Str.toLowerCase().replace(/sch\./g, 'sch').replace(/sch /g, 'sch').replace(/\s+/g, '').trim();
      if (!schClean.startsWith('sch') && schClean.length > 0 && !isNaN(parseInt(schClean))) {
        schClean = 'sch' + schClean;
      }
      if (schClean === 'std') schClean = 'sch40';
      if (schClean === 'xs') schClean = 'sch80';

      let wtPerM = matDef?.weightPerMeterKg || 0;

      if (wtPerM <= 0 && npsClean && pipeLookup[npsClean]) {
        if (schClean && pipeLookup[npsClean][schClean]) {
          wtPerM = pipeLookup[npsClean][schClean];
        } else if (pipeLookup[npsClean]['sch80']) {
          wtPerM = pipeLookup[npsClean]['sch80'];
        }
      }

      // Direct OD & WT numeric calculation fallback
      if (wtPerM <= 0 && d2Num > 0 && d3Num > 0) {
        wtPerM = (d2Num - d3Num) * d3Num * 0.0246615;
      }

      if (wtPerM > 0 && lenM > 0) {
        weightKg = Math.round(wtPerM * lenM * pcs * 100) / 100;
      }
    } else if (isGrating) {
      const lMm = d1Num;
      const wMm = d2Num;
      const mult = d4Num > 0 ? d4Num : qty;
      const areaM2 = (lMm * wMm) / 1_000_000;
      // Standard marine serrated steel grating (37.037 kg/m2)
      let wtM2 = matDef?.weightPerMeterKg || 37.037037;
      if (d3Num > 0) {
        wtM2 = d3Num;
      }
      if (areaM2 > 0) {
        weightKg = Math.round((areaM2 * wtM2 * mult) * 100) / 100;
      }
    } else if (isChequered) {
      const lMm = d1Num;
      const wMm = d2Num;
      const tMm = d3Num > 0 ? d3Num : 12;
      const mult = d4Num > 0 ? d4Num : qty;
      const areaM2 = (lMm * wMm) / 1_000_000;
      // Formula: base plate weight + pattern weight (~2.1014 kg/m2)
      const wtM2 = (tMm * 7.85) + 2.1014;
      if (areaM2 > 0) {
        weightKg = Math.round((areaM2 * wtM2 * mult) * 100) / 100;
      }
    } else if (isRoundBar) {
      const lenMm = dLenNum > 0 ? dLenNum : 6000;
      const lenM = lenMm / 1000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);
      const isInch =
        upperCode.includes('IN') ||
        d1Str.includes('"') ||
        d2Str.toUpperCase().includes('IN');

      const diaMm = isInch ? d1Num * 25.4 : d1Num;

      if (diaMm > 0 && lenM > 0) {
        weightKg = Math.round((Math.PI * Math.pow(diaMm / 2, 2) * lenMm * 7.85 / 1_000_000 * pcs) * 100) / 100;
      }
    } else if (isFlatBar) {
      const lenMm = dLenNum > 0 ? dLenNum : 6000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);
      const width = d1Num > 0 ? d1Num : d2Num;
      const thick = d3Num > 0 ? d3Num : (d2Num > 0 && d1Num > 0 ? d2Num : 0);

      if (width > 0 && thick > 0 && lenMm > 0) {
        weightKg = Math.round((width * thick * lenMm * 7.85 / 1_000_000 * pcs) * 100) / 100;
      }
    } else if (isUnequalAngle) {
      const lenMm = dLenNum > 0 ? dLenNum : 6000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);
      const leg1 = d1Num;
      const leg2 = d2Num > 0 ? d2Num : d1Num;
      const thick = d3Num;

      if (leg1 > 0 && thick > 0 && lenMm > 0) {
        weightKg = Math.round(((leg1 + leg2 - thick) * thick * lenMm * 7.85 / 1_000_000 * pcs) * 100) / 100;
      }
    } else if (isEqualAngle) {
      const lenMm = dLenNum > 0 ? dLenNum : 6000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);
      const leg = d1Num;
      const thick = d3Num > 0 ? d3Num : (d2Num > 0 ? d2Num : 0);

      if (leg > 0 && thick > 0 && lenMm > 0) {
        weightKg = Math.round(((leg + leg - thick) * thick * lenMm * 7.85 / 1_000_000 * pcs) * 100) / 100;
      }
    } else if (isSquareBar) {
      const lenMm = dLenNum > 0 ? dLenNum : 6000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);
      const s1 = d1Num;
      const s2 = d2Num > 0 ? d2Num : s1;

      if (s1 > 0 && lenMm > 0) {
        weightKg = Math.round((s1 * s2 * lenMm * 7.85 / 1_000_000 * pcs) * 100) / 100;
      }
    } else if (isHBeam) {
      const lenMm = dLenNum > 0 ? dLenNum : 6000;
      const lenM = lenMm / 1000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);
      const hbLookup: Record<number, number> = {
        100: 17.2,
        125: 23.6,
        150: 31.5,
        175: 40.2,
        200: 49.9,
        250: 72.4,
        300: 94.0,
        350: 137.0,
        400: 172.0,
      };
      const wtM = hbLookup[Math.round(d1Num)] || matDef?.weightPerMeterKg || 49.9;
      if (wtM > 0 && lenM > 0) {
        weightKg = Math.round(wtM * lenM * pcs * 100) / 100;
      }
    } else if (isWF) {
      const lenMm = dLenNum > 0 ? dLenNum : 6000;
      const lenM = lenMm / 1000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);
      const wfLookup: Record<number, number> = {
        100: 9.33,
        125: 13.1,
        150: 14.0,
        175: 18.1,
        200: 21.3,
        250: 29.6,
        300: 36.7,
        350: 49.6,
        400: 66.0,
      };
      const wtM = wfLookup[Math.round(d1Num)] || matDef?.weightPerMeterKg || 21.3;
      if (wtM > 0 && lenM > 0) {
        weightKg = Math.round(wtM * lenM * pcs * 100) / 100;
      }
    } else if (isUNP) {
      const lenMm = dLenNum > 0 ? dLenNum : 6000;
      const lenM = lenMm / 1000;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);
      const unpLookup: Record<number, number> = {
        50: 5.59,
        65: 7.09,
        80: 8.64,
        100: 9.36,
        120: 13.4,
        150: 18.6,
        200: 24.6,
        250: 34.6,
        300: 38.1,
      };
      const wtM = unpLookup[Math.round(d1Num)] || matDef?.weightPerMeterKg || 9.36;
      if (wtM > 0 && lenM > 0) {
        weightKg = Math.round(wtM * lenM * pcs * 100) / 100;
      }
    } else if (isPlate) {
      const lMm = dLenNum > 0 ? dLenNum : d1Num;
      const wMm = d2Num;
      const tMm = d3Num;
      const mult = d4Num > 0 ? d4Num : qty;
      let density = 7.85;
      if (upperCode.includes('ABS')) density = 7.85;
      if (upperCode.includes('STAINLESS') || upperCode.includes('SS') || upperCode.includes('304') || upperCode.includes('316')) {
        density = 7.93;
      }

      if (lMm > 0 && wMm > 0 && tMm > 0) {
        weightKg = Math.round((lMm * wMm * tMm * density / 1_000_000 * mult) * 100) / 100;
      }
    } else {
      // General profile or catalog fallback
      const lenMm = dLenNum > 0 ? dLenNum : (d1Num > 0 ? d1Num : 6000);
      const lenM = lenMm / 1000;
      let wtPerM = matDef?.weightPerMeterKg || 0;
      const pcs = d4Num > 0 ? d4Num : (qty > 0 ? qty : 1);

      if (wtPerM <= 0 && d1Num > 0 && d2Num > 0 && d3Num > 0) {
        // Assume hollow / general profile
        wtPerM = (d1Num * d2Num * d3Num * 7.85) / 1_000_000;
      }

      if (wtPerM > 0 && lenM > 0) {
        weightKg = Math.round(wtPerM * lenM * pcs * 100) / 100;
      }
    }

    const weightTon = Math.round((weightKg / 1000) * 1000) / 1000;
    const formattedWeight = this.formatWeight(weightKg);

    let totalPrice = 0;
    let effectiveQty = qty;

    if (isMeterUnit && (dLenNum > 0 || d1Num > 0)) {
      const lenMmForCalc = dLenNum > 0 ? dLenNum : d1Num;
      const lenMForCalc = lenMmForCalc / 1000;
      const d4Val = d4Num > 0 ? d4Num : 1;
      const calculatedMeters = lenMForCalc * d4Val;
      effectiveQty = Math.round(calculatedMeters * 1000) / 1000;
      qty = effectiveQty;
    }

    if (params.priceBasis === 'weight') {
      totalPrice = Math.round((weightKg > 0 ? weightKg : effectiveQty) * unitPrice);
    } else if (params.priceBasis === 'qty') {
      totalPrice = Math.round(effectiveQty * unitPrice);
    } else if (unit.toLowerCase().trim() === 'kg' && weightKg > 0) {
      totalPrice = Math.round(weightKg * unitPrice);
    } else if (isMeterUnit) {
      totalPrice = Math.round(effectiveQty * unitPrice);
    } else {
      totalPrice = Math.round(qty * unitPrice);
    }

    const formattedTotalPrice = this.formatRupiah(totalPrice);

    return {
      weightKg,
      weightTon,
      formattedWeight,
      unitPrice,
      totalPrice,
      formattedTotalPrice,
      unit,
      materialDef: matDef,
    };
  }

  /**
   * Format berat tonase (kg / ton)
   */
  static formatWeight(weightKg: number): string {
    if (weightKg >= 1000) {
      const tons = (weightKg / 1000).toFixed(3);
      return `${weightKg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg (${tons} Ton)`;
    }
    return `${weightKg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  }

  /**
   * Format mata uang Rupiah
   */
  static formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Helper nama & label kategori material
   */
  static getMaterialCategoryInfo(category: MaterialCategory): {
    label: string;
    iconText: string;
    unitDefault: string;
    badgeBg: string;
    badgeText: string;
  } {
    switch (category) {
      case 'pipe':
        return {
          label: 'Pipa (Pipe)',
          iconText: 'PP',
          unitDefault: 'm / kg',
          badgeBg: 'bg-cyan-50 border-cyan-200 text-cyan-700',
          badgeText: 'Pipa Baja',
        };
      case 'hbeam':
        return {
          label: 'H-Beam / WF',
          iconText: 'HB',
          unitDefault: 'm / kg',
          badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          badgeText: 'H-Beam / WF',
        };
      case 'angle':
        return {
          label: 'Angle Bar (Siku L)',
          iconText: 'L',
          unitDefault: 'm / kg',
          badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
          badgeText: 'Besi Siku',
        };
      case 'flatbar':
        return {
          label: 'Flat Bar (Plat Strip)',
          iconText: 'FB',
          unitDefault: 'm / kg',
          badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
          badgeText: 'Flat Bar',
        };
      case 'roundbar':
        return {
          label: 'Round Bar (Besi As)',
          iconText: 'RB',
          unitDefault: 'm / kg',
          badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          badgeText: 'Round Bar',
        };
      case 'squarebar':
        return {
          label: 'Square Bar (Nako)',
          iconText: 'SB',
          unitDefault: 'm / kg',
          badgeBg: 'bg-teal-50 border-teal-200 text-teal-700',
          badgeText: 'Besi Nako',
        };
      case 'grating':
        return {
          label: 'Grating Plate',
          iconText: 'GR',
          unitDefault: 'm² / kg',
          badgeBg: 'bg-orange-50 border-orange-200 text-orange-700',
          badgeText: 'Grating',
        };
      case 'bordes':
        return {
          label: 'Plat Bordes (Chequered)',
          iconText: 'BD',
          unitDefault: 'm² / kg',
          badgeBg: 'bg-purple-50 border-purple-200 text-purple-700',
          badgeText: 'Plat Bordes',
        };
      case 'channel':
        return {
          label: 'Channel Bar (UNP)',
          iconText: 'UNP',
          unitDefault: 'm / kg',
          badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
          badgeText: 'Kanal UNP',
        };
      case 'plate':
      default:
        return {
          label: 'Pelat Baja (Steel Plate)',
          iconText: 'PL',
          unitDefault: 'kg',
          badgeBg: 'bg-slate-100 border-slate-200 text-slate-700',
          badgeText: 'Pelat Baja',
        };
    }
  }

  /**
   * Helper info grade pelat baja (ABS, BKI, NC)
   */
  static getSteelPlateGradeInfo(grade?: string | number): SteelPlateGradeOption {
    const clean = String(grade ?? '').toUpperCase();
    if (clean.includes('ABS')) {
      return STEEL_PLATE_GRADES[0];
    }
    if (clean.includes('NC') || clean.includes('NON-CLASS') || clean.includes('NON CLASS')) {
      return STEEL_PLATE_GRADES[2];
    }
    // Default BKI
    return STEEL_PLATE_GRADES[1];
  }

  /**
   * Get material type definition by code, name, or keyword
   */
  static getMaterialType(codeOrName?: string | number): MaterialTypeDefinition | undefined {
    if (codeOrName === undefined || codeOrName === null) return undefined;
    const clean = String(codeOrName).trim().toUpperCase();
    if (!clean) return undefined;

    // 1. Direct exact match by code or name
    const exact = _activeMaterialCatalog.find(
      (m) => String(m.code || '').toUpperCase() === clean || String(m.name || '').toUpperCase() === clean
    );
    if (exact) return exact;

    // 2. Match if code or clean starts with the other
    const startsWith = _activeMaterialCatalog.find((m) => {
      const c = String(m.code || '').toUpperCase();
      return clean.startsWith(c) || c.startsWith(clean);
    });
    if (startsWith) return startsWith;

    // 3. Keyword & Alias Intelligent Mapping
    if (clean.includes('BKI')) return _activeMaterialCatalog.find((m) => m.code === 'PL BKI');
    if (clean.includes('ABS') && clean.includes('DH36')) return _activeMaterialCatalog.find((m) => m.code === 'PL ABS DH36');
    if (clean.includes('ABS')) return _activeMaterialCatalog.find((m) => m.code === 'PL ABS');
    if (clean.includes('SS304') || clean.includes('SUS304') || clean.includes('STAINLESS 304')) return _activeMaterialCatalog.find((m) => m.code === 'PL SS304');
    if (clean.includes('NC') || clean.includes('NON CLASS')) return _activeMaterialCatalog.find((m) => m.code === 'PL NC');
    if (clean.includes('PL') || clean.includes('PELAT') || clean.includes('PLATE')) return _activeMaterialCatalog.find((m) => m.code === 'PL BKI');

    if (clean.includes('SIKU') || clean.includes('ANGLE') || clean.startsWith('L ')) return _activeMaterialCatalog.find((m) => m.category === 'profile' && m.code.startsWith('L '));
    if (clean.includes('UNP') || clean.includes('KANAL')) return _activeMaterialCatalog.find((m) => m.code.startsWith('UNP'));
    if (clean.includes('H-BEAM') || clean.includes('HBEAM')) return _activeMaterialCatalog.find((m) => m.code.startsWith('H '));
    if (clean.includes('HP') || clean.includes('HOLLAND')) return _activeMaterialCatalog.find((m) => m.code.startsWith('HP'));
    if (clean.includes('FB') || clean.includes('FLAT BAR') || clean.includes('STRIP')) return _activeMaterialCatalog.find((m) => m.code.startsWith('FB'));
    if (clean.includes('ROUND') || clean.includes('AS BESI')) return _activeMaterialCatalog.find((m) => m.code.startsWith('ROUND'));

    if (clean.includes('PIPE') || clean.includes('PIPA') || clean.includes('SCH')) {
      const matchPipe = _activeMaterialCatalog.find((m) => m.category === 'pipe' && clean.includes(m.code.split(' ')[1] || 'XYZ'));
      return matchPipe || _activeMaterialCatalog.find((m) => m.category === 'pipe');
    }

    if (clean.includes('SANDBLAST') || clean.includes('BLAST')) return _activeMaterialCatalog.find((m) => m.code === 'BLAST SA 2.5');
    if (clean.includes('CAT') || clean.includes('PAINT') || clean.includes('PENGECATAN')) return _activeMaterialCatalog.find((m) => m.code === 'PAINT AC');
    if (clean.includes('DOCK') || clean.includes('DOCKING')) return _activeMaterialCatalog.find((m) => m.code.startsWith('DOCKING'));
    if (clean.includes('ZINC') || clean.includes('ANODE')) return _activeMaterialCatalog.find((m) => m.code === 'ZINC ANODE ZP5');
    if (clean.includes('VALVE')) return _activeMaterialCatalog.find((m) => m.code === 'VALVE OH');
    if (clean.includes('PROP')) return _activeMaterialCatalog.find((m) => m.code === 'PROP POLISH');
    if (clean.includes('SHAFT') || clean.includes('TAILSHAFT')) return _activeMaterialCatalog.find((m) => m.code === 'SHAFT DRAW');
    if (clean.includes('RUDDER') || clean.includes('KEMUDI')) return _activeMaterialCatalog.find((m) => m.code === 'RUDDER CLR');
    if (clean.includes('HYDROTEST') || clean.includes('TEST TANK')) return _activeMaterialCatalog.find((m) => m.code === 'HYDROTEST');
    if (clean.includes('NDT') || clean.includes('UT')) return _activeMaterialCatalog.find((m) => m.code === 'NDT UT/MPI');
    if (clean.includes('OVERHAUL') || clean.includes('ME')) return _activeMaterialCatalog.find((m) => m.code === 'ME OVERHAUL');

    // 4. Substring fallback search
    return _activeMaterialCatalog.find(
      (m) =>
        m.code.toUpperCase().includes(clean) ||
        m.name.toUpperCase().includes(clean) ||
        (m.descriptionHint && m.descriptionHint.toUpperCase().includes(clean))
    );
  }

  /**
   * Search material types with category filtering
   */
  static searchMaterialTypes(query: string, category: string = 'all'): MaterialTypeDefinition[] {
    let list = _activeMaterialCatalog;
    if (category && category !== 'all') {
      list = list.filter((m) => m.category === category);
    }
    if (!query || !query.trim()) {
      return list;
    }
    const q = query.toLowerCase().trim();
    return list.filter(
      (m) =>
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.categoryLabel.toLowerCase().includes(q) ||
        (m.descriptionHint && m.descriptionHint.toLowerCase().includes(q))
    );
  }

  /**
   * Get all material types
   */
  static getAllMaterialTypes(): MaterialTypeDefinition[] {
    return _activeMaterialCatalog;
  }

  /**
   * Get dynamic active catalog copy
   */
  static getMaterialCatalog(): MaterialTypeDefinition[] {
    return [..._activeMaterialCatalog];
  }

  /**
   * Save catalog to state and localStorage
   */
  static saveCatalog(newCatalog: MaterialTypeDefinition[]): void {
    _activeMaterialCatalog = [...newCatalog];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_activeMaterialCatalog));
    } catch (e) {
      console.error('Failed to save material catalog to localStorage', e);
    }
    notifyCatalogListeners();
  }

  /**
   * Update specific item in catalog by code
   */
  static updateMaterialType(code: string, updated: Partial<MaterialTypeDefinition>): boolean {
    const idx = _activeMaterialCatalog.findIndex((m) => m.code.toUpperCase() === code.toUpperCase());
    if (idx === -1) return false;
    _activeMaterialCatalog[idx] = { ..._activeMaterialCatalog[idx], ...updated };
    this.saveCatalog(_activeMaterialCatalog);
    return true;
  }

  /**
   * Update full item and optionally change its code safely
   */
  static updateMaterialTypeFull(oldCode: string, newItem: MaterialTypeDefinition): boolean {
    const idx = _activeMaterialCatalog.findIndex((m) => m.code.toUpperCase() === oldCode.toUpperCase());
    if (idx === -1) {
      // If not found, add it
      return this.addMaterialType(newItem);
    }
    // Check if new code already exists on another item
    if (oldCode.toUpperCase() !== newItem.code.toUpperCase()) {
      const conflict = _activeMaterialCatalog.some(
        (m, i) => i !== idx && m.code.toUpperCase() === newItem.code.toUpperCase()
      );
      if (conflict) {
        return false;
      }
    }
    _activeMaterialCatalog[idx] = { ...newItem };
    this.saveCatalog(_activeMaterialCatalog);
    return true;
  }

  /**
   * Add new item to catalog
   */
  static addMaterialType(item: MaterialTypeDefinition): boolean {
    const exists = _activeMaterialCatalog.some((m) => m.code.toUpperCase() === item.code.toUpperCase());
    if (exists) {
      return false;
    }
    _activeMaterialCatalog = [item, ..._activeMaterialCatalog];
    this.saveCatalog(_activeMaterialCatalog);
    return true;
  }

  /**
   * Delete item from catalog by code
   */
  static deleteMaterialType(code: string): boolean {
    _activeMaterialCatalog = _activeMaterialCatalog.filter((m) => m.code.toUpperCase() !== code.toUpperCase());
    this.saveCatalog(_activeMaterialCatalog);
    return true;
  }

  /**
   * Reset catalog to initial shipyard standards
   */
  static resetCatalogToDefault(): void {
    _activeMaterialCatalog = JSON.parse(JSON.stringify(DEFAULT_MATERIAL_TYPE_CATALOG));
    this.saveCatalog(_activeMaterialCatalog);
  }

  /**
   * Apply bulk percentage markup or discount
   */
  static applyPercentageMarkup(category: string, percentage: number): void {
    const factor = 1 + percentage / 100;
    _activeMaterialCatalog = _activeMaterialCatalog.map((item) => {
      if (category === 'all' || item.category === category) {
        const newPrice = Math.round((item.defaultUnitPrice * factor) / 100) * 100;
        return { ...item, defaultUnitPrice: Math.max(0, newPrice) };
      }
      return item;
    });
    this.saveCatalog(_activeMaterialCatalog);
  }

  /**
   * Get dynamic and descriptive input labels for D1 - D4 based on Type
   */
  static getDimensionLabels(typeCode?: string | number): {
    d1: string;
    d2: string;
    d3: string;
    dLen: string;
    d4: string;
    placeholder1: string;
    placeholder2: string;
    placeholder3: string;
    placeholderLen: string;
    placeholder4: string;
    name?: string;
    unitPrice?: number;
    unit?: string;
  } {
    const code = String(typeCode ?? '').trim().toUpperCase();
    
    // Check direct match in catalog
    const matDef = this.getMaterialType(typeCode);
    if (matDef) {
      return {
        d1: matDef.d1Label || 'D1 (Dimensi 1 mm)',
        d2: matDef.d2Label || 'D2 (Dimensi 2 mm)',
        d3: matDef.d3Label || 'D3 (Tebal mm)',
        dLen: matDef.dLenLabel || 'Panjang (mm)',
        d4: matDef.d4Label || 'D4 (Pengali)',
        placeholder1: '',
        placeholder2: '',
        placeholder3: '',
        placeholderLen: '6000',
        placeholder4: '',
        name: matDef.name,
        unitPrice: matDef.defaultUnitPrice,
        unit: matDef.defaultUnit,
      };
    }

    // Pattern matching based on user typing
    if (code.startsWith('PL') || code.includes('PLATE') || code.includes('PELAT') || code.includes('PLAT')) {
      return {
        d1: 'Panjang (mm)',
        d2: 'Lebar (mm)',
        d3: 'Tebal (mm)',
        dLen: 'Panjang (-)',
        d4: 'D4/qty (Ea)',
        placeholder1: '6100',
        placeholder2: '1830',
        placeholder3: '12',
        placeholderLen: '-',
        placeholder4: '1',
        name: 'Pelat Baja / Plate (PL ABS)',
      };
    }

    if (code.startsWith('PP') || code.includes('PIPE') || code.includes('PIPA')) {
      return {
        d1: 'NPS / Size',
        d2: 'Satuan (inchi/mm)',
        d3: 'Schedule (Sch.80/40)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '3',
        placeholder2: 'inchi',
        placeholder3: 'Sch.80',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Pipa Baja / Pipe (PP-B)',
      };
    }

    if (code === 'RB IN' || (code.startsWith('RB') && (code.includes('IN') || code.includes('INCH')))) {
      return {
        d1: 'Dia (Inchi)',
        d2: 'N/A (-)',
        d3: 'N/A (-)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '2',
        placeholder2: '-',
        placeholder3: '-',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Round Bar Inchi (RB IN)',
      };
    }

    if (code.startsWith('RB') || code.includes('ROUND') || code.includes('AS BULAT') || code.includes('AS ')) {
      return {
        d1: 'Dia (mm)',
        d2: 'N/A (-)',
        d3: 'N/A (-)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '22',
        placeholder2: '-',
        placeholder3: '-',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Round Bar MM (RB MM)',
      };
    }

    if (code === 'FB' || code.startsWith('FB ') || code.startsWith('FB-') || code.includes('FLAT') || code.includes('FLATBAR')) {
      return {
        d1: 'Lebar (mm)',
        d2: 'N/A (-)',
        d3: 'Tebal (mm)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '75',
        placeholder2: '-',
        placeholder3: '12',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Flat Bar (FB)',
      };
    }

    if (code === 'UA' || code.startsWith('UA ') || code.includes('UNEQUAL') || code.includes('BEDA SISI')) {
      return {
        d1: 'Sayap 1 (mm)',
        d2: 'Sayap 2 (mm)',
        d3: 'Tebal (mm)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '125',
        placeholder2: '75',
        placeholder3: '10',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Unequal Angle / Siku Beda Sisi (UA)',
      };
    }

    if (code === 'EA' || code.startsWith('EA ') || code.startsWith('L ') || code.startsWith('L-') || code.includes('SIKU') || code.includes('EQUAL')) {
      return {
        d1: 'Sayap (mm)',
        d2: 'N/A (-)',
        d3: 'Tebal (mm)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '100',
        placeholder2: '-',
        placeholder3: '10',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Equal Angle / Siku Sama Sisi (EA)',
      };
    }

    if (code === 'SB' || code.startsWith('SB ') || code.includes('SQUARE') || code.includes('KOTAK')) {
      return {
        d1: 'Sisi (mm)',
        d2: 'N/A (-)',
        d3: 'N/A (-)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '22',
        placeholder2: '-',
        placeholder3: '-',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Square Bar / Besi Kotak (SB)',
      };
    }

    if (code.startsWith('CQR') || code.includes('BORDES') || code.includes('CHEQUER')) {
      return {
        d1: 'Panjang (mm)',
        d2: 'Lebar (mm)',
        d3: 'Tebal (mm)',
        dLen: 'Panjang (-)',
        d4: 'D4/qty (Ea)',
        placeholder1: '2440',
        placeholder2: '1220',
        placeholder3: '12',
        placeholderLen: '-',
        placeholder4: '1',
        name: 'Chequered Plate / Pelat Bordes (CQR)',
      };
    }

    if (code.startsWith('GR') || code.includes('GRATING')) {
      return {
        d1: 'Panjang (mm)',
        d2: 'Lebar (mm)',
        d3: 'N/A (-)',
        dLen: 'Panjang (-)',
        d4: 'D4/qty (Ea)',
        placeholder1: '4000',
        placeholder2: '900',
        placeholder3: '-',
        placeholderLen: '-',
        placeholder4: '1',
        name: 'Steel Grating (GR)',
      };
    }

    if (code === 'HB' || code.startsWith('HB ') || code.startsWith('H-BEAM') || code.startsWith('H BEAM')) {
      return {
        d1: 'Ukuran Nominal (mm)',
        d2: 'N/A (-)',
        d3: 'N/A (-)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '200',
        placeholder2: '-',
        placeholder3: '-',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'H-Beam (HB)',
      };
    }

    if (code.startsWith('WF') || code.includes('WIDE FLANGE')) {
      return {
        d1: 'Ukuran Nominal (mm)',
        d2: 'N/A (-)',
        d3: 'N/A (-)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '200',
        placeholder2: '-',
        placeholder3: '-',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Wide Flange (WF)',
      };
    }

    if (code.startsWith('UNP') || code.startsWith('UPN') || code.includes('KANAL U') || code.includes('CHANNEL')) {
      return {
        d1: 'Ukuran Nominal (mm)',
        d2: 'N/A (-)',
        d3: 'N/A (-)',
        dLen: 'Panjang (mm)',
        d4: 'D4/qty (Ea)',
        placeholder1: '100',
        placeholder2: '-',
        placeholder3: '-',
        placeholderLen: '6000',
        placeholder4: '1',
        name: 'Kanal U (UNP)',
      };
    }

    return {
      d1: 'D1 (Dimensi 1 mm)',
      d2: 'D2 (Dimensi 2 mm)',
      d3: 'D3 (Tebal mm)',
      dLen: 'Panjang (mm)',
      d4: 'D4 (Pengali/Pcs)',
      placeholder1: '',
      placeholder2: '',
      placeholder3: '',
      placeholderLen: '6000',
      placeholder4: '',
    };
  }

  /**
   * Subscribe to catalog changes
   */
  static subscribeCatalog(listener: (catalog: MaterialTypeDefinition[]) => void): () => void {
    _catalogListeners.push(listener);
    return () => {
      const idx = _catalogListeners.indexOf(listener);
      if (idx !== -1) {
        _catalogListeners.splice(idx, 1);
      }
    };
  }
}

export interface MaterialTypeDefinition {
  code: string;
  name: string;
  category: 'plate' | 'pipe' | 'profile' | 'service' | 'other';
  categoryLabel: string;
  defaultUnit: string;
  defaultUnitPrice: number;
  d1Label?: string;
  d2Label?: string;
  d3Label?: string;
  dLenLabel?: string;
  d4Label?: string;
  defaultD1?: string | number;
  defaultD2?: string | number;
  defaultD3?: string | number;
  defaultDLen?: string | number;
  defaultD4?: string | number;
  density?: number;
  weightPerMeterKg?: number;
  weightPerSqmKg?: number;
  isSteelTonnage: boolean;
  descriptionHint?: string;
  badgeBg?: string;
  badgeText?: string;
}

export const DEFAULT_MATERIAL_TYPE_CATALOG: MaterialTypeDefinition[] = [
  // --- 1. PELAT BAJA & SPECIAL MARINE PLATES ---
  {
    code: 'PL BKI',
    name: 'Pelat Baja Marine BKI Grade A',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    density: 7.85,
    isSteelTonnage: true,
    descriptionHint: 'Replating Pelat Lambung / Geladak BKI Grade A',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'PL BKI',
  },
  {
    code: 'PL ABS',
    name: 'Pelat Baja Marine ABS Class Grade A',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 52000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    density: 7.85,
    isSteelTonnage: true,
    descriptionHint: 'Replating Pelat Lambung / Bottom Class ABS International',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'PL ABS',
  },
  {
    code: 'PL ABS DH36',
    name: 'Pelat Baja High Tensile ABS Class DH36',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 58000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    density: 7.85,
    isSteelTonnage: true,
    descriptionHint: 'Pelat Baja Kuat Tinggi High Tensile Structural Steel ABS DH36',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'DH36',
  },
  {
    code: 'PL NC',
    name: 'Pelat Baja Non-Class / Sekat Umum',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 42000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    density: 7.85,
    isSteelTonnage: true,
    descriptionHint: 'Penggantian Pelat Sekat / Bracket Non-Class',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
    badgeText: 'PL NC',
  },
  {
    code: 'PL SS304',
    name: 'Pelat Stainless Steel SUS 304',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 85000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    density: 7.93,
    isSteelTonnage: true,
    descriptionHint: 'Pelat Stainless Steel Tanki Air / Galley SUS 304',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'PL SS304',
  },
  {
    code: 'PL SS316L',
    name: 'Pelat Stainless Steel SUS 316L (Chemical Tanker)',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 115000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    density: 7.98,
    isSteelTonnage: true,
    descriptionHint: 'Pelat Stainless Steel SUS 316L Khusus Tangki Kargo Chemical/Oil Tanker',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'SS316L',
  },
  {
    code: 'PL AL5083',
    name: 'Pelat Aluminium Marine Grade 5083-H116',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 95000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    density: 2.66,
    isSteelTonnage: false,
    descriptionHint: 'Pelat Aluminium Khusus Superstructure / Speedboat Crew Boat 5083-H116',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'AL 5083',
  },
  {
    code: 'BORDES 2.3',
    name: 'Plat Bordes (Chequered Plate) 2.3 mm',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 50000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    defaultD3: '2.3',
    density: 7.85,
    weightPerSqmKg: 19.70,
    isSteelTonnage: true,
    descriptionHint: 'Lantai Gangway & Tangga Kapal Ringan 2.3mm',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'Bordes 2.3',
  },
  {
    code: 'BORDES 3.2',
    name: 'Plat Bordes (Chequered Plate) 3.2 mm',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 50000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    defaultD3: '3.2',
    density: 7.85,
    weightPerSqmKg: 26.80,
    isSteelTonnage: true,
    descriptionHint: 'Lantai Geladak Walkway & Kamar Mesin Standard 3.2mm',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'Bordes 3.2',
  },
  {
    code: 'BORDES 4.5',
    name: 'Plat Bordes (Chequered Plate) 4.5 mm',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'kg',
    defaultUnitPrice: 50000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    defaultD3: '4.5',
    density: 7.85,
    weightPerSqmKg: 37.00,
    isSteelTonnage: true,
    descriptionHint: 'Lantai Geladak Work Deck & Ramp Door Heavy Duty 4.5mm',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'Bordes 4.5',
  },
  {
    code: 'GRATING 25x5',
    name: 'Steel Grating Serrated Galvanized 25x5 mm',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'm²',
    defaultUnitPrice: 850000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    weightPerSqmKg: 38.80,
    isSteelTonnage: false,
    descriptionHint: 'Lantai Grating Galvanis Anti-Selip Kamar Mesin Engine Room 25x5mm',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'Grating 25x5',
  },
  {
    code: 'GRATING 32x5',
    name: 'Steel Grating Galvanized 32x5 mm Heavy Duty',
    category: 'plate',
    categoryLabel: 'Pelat Baja',
    defaultUnit: 'm²',
    defaultUnitPrice: 1100000,
    d1Label: 'P (mm)',
    d2Label: 'L (mm)',
    d3Label: 'T (mm)',
    d4Label: 'Pcs',
    weightPerSqmKg: 47.50,
    isSteelTonnage: false,
    descriptionHint: 'Lantai Platform Grating Pompa Kargo & Machinery Heavy Duty 32x5mm',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'Grating 32x5',
  },

  // --- 2. PIPA BAJA MARINE (PIPING & TUBING 1/2" - 24" SCH 40 & SCH 80 - HITAM & GALVANIS) ---
  // --- 1/2" ---
  {
    code: 'PIPE 1/2" SCH40 CS',
    name: 'Pipa Baja Hitam 1/2" Sch 40 (OD 21.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 62000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '21.3',
    defaultD2: '2.77',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 1.27,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sounding / Air Line Hitam 1/2" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '1/2" Sch40 CS',
  },
  {
    code: 'PIPE 1/2" SCH40 GALV',
    name: 'Pipa Baja Galvanis 1/2" Sch 40 (OD 21.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 78000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '21.3',
    defaultD2: '2.77',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 1.27,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water / Air Vent Galvanis 1/2" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '1/2" Sch40 Galv',
  },
  {
    code: 'PIPE 1/2" SCH80 CS',
    name: 'Pipa Baja Hitam 1/2" Sch 80 (OD 21.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 80000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '21.3',
    defaultD2: '3.73',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 1.62,
    isSteelTonnage: true,
    descriptionHint: 'Pipa High Pressure Hitam 1/2" Sch 80',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '1/2" Sch80 CS',
  },
  {
    code: 'PIPE 1/2" SCH80 GALV',
    name: 'Pipa Baja Galvanis 1/2" Sch 80 (OD 21.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 98000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '21.3',
    defaultD2: '3.73',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 1.62,
    isSteelTonnage: true,
    descriptionHint: 'Pipa High Pressure Galvanis 1/2" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '1/2" Sch80 Galv',
  },

  // --- 3/4" ---
  {
    code: 'PIPE 3/4" SCH40 CS',
    name: 'Pipa Baja Hitam 3/4" Sch 40 (OD 26.7 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 82000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '26.7',
    defaultD2: '2.87',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 1.69,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Fresh Water / Air Line 3/4" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '3/4" Sch40 CS',
  },
  {
    code: 'PIPE 3/4" SCH40 GALV',
    name: 'Pipa Baja Galvanis 3/4" Sch 40 (OD 26.7 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 102000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '26.7',
    defaultD2: '2.87',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 1.69,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Tawar / Saniter Galvanis 3/4" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '3/4" Sch40 Galv',
  },
  {
    code: 'PIPE 3/4" SCH80 CS',
    name: 'Pipa Baja Hitam 3/4" Sch 80 (OD 26.7 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 108000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '26.7',
    defaultD2: '3.91',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 2.20,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Hidrolik Tebal 3/4" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '3/4" Sch80 CS',
  },
  {
    code: 'PIPE 3/4" SCH80 GALV',
    name: 'Pipa Baja Galvanis 3/4" Sch 80 (OD 26.7 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 132000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '26.7',
    defaultD2: '3.91',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 2.20,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Laut High Pressure Galvanis 3/4" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '3/4" Sch80 Galv',
  },

  // --- 1" ---
  {
    code: 'PIPE 1" SCH40',
    name: 'Pipa Baja Hitam 1" Sch 40 (OD 33.4 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 120000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '33.4',
    defaultD2: '3.38',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 2.50,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Fresh Water / FO Service 1" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '1" Sch40 CS',
  },
  {
    code: 'PIPE 1" SCH40 GALV',
    name: 'Pipa Baja Galvanis 1" Sch 40 (OD 33.4 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 150000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '33.4',
    defaultD2: '3.38',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 2.50,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Minum / Saniter Galvanis 1" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '1" Sch40 Galv',
  },
  {
    code: 'PIPE 1" SCH80 CS',
    name: 'Pipa Baja Hitam 1" Sch 80 (OD 33.4 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 158000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '33.4',
    defaultD2: '4.55',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 3.24,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Bahan Bakar High Pressure 1" Sch 80',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '1" Sch80 CS',
  },
  {
    code: 'PIPE 1" SCH80 GALV',
    name: 'Pipa Baja Galvanis 1" Sch 80 (OD 33.4 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 195000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '33.4',
    defaultD2: '4.55',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 3.24,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Deck Line Galvanis 1" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '1" Sch80 Galv',
  },

  // --- 1-1/4" ---
  {
    code: 'PIPE 1-1/4" SCH40 CS',
    name: 'Pipa Baja Hitam 1-1/4" Sch 40 (OD 42.2 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 165000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '42.2',
    defaultD2: '3.56',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 3.39,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Bilge / Service Line 1-1/4" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '1-1/4" Sch40 CS',
  },
  {
    code: 'PIPE 1-1/4" SCH40 GALV',
    name: 'Pipa Baja Galvanis 1-1/4" Sch 40 (OD 42.2 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 205000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '42.2',
    defaultD2: '3.56',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 3.39,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Laut Handrail Galvanis 1-1/4" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '1-1/4" Sch40 Galv',
  },
  {
    code: 'PIPE 1-1/4" SCH80 CS',
    name: 'Pipa Baja Hitam 1-1/4" Sch 80 (OD 42.2 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 218000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '42.2',
    defaultD2: '4.85',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 4.47,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Steam / Hydraulic Line 1-1/4" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '1-1/4" Sch80 CS',
  },
  {
    code: 'PIPE 1-1/4" SCH80 GALV',
    name: 'Pipa Baja Galvanis 1-1/4" Sch 80 (OD 42.2 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 268000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '42.2',
    defaultD2: '4.85',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 4.47,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Deck Washing Galvanis 1-1/4" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '1-1/4" Sch80 Galv',
  },

  // --- 1-1/2" ---
  {
    code: 'PIPE 1-1/2" SCH40',
    name: 'Pipa Baja Hitam 1-1/2" Sch 40 (OD 48.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 195000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '48.3',
    defaultD2: '3.68',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 4.05,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Bilge / Air Vent Hitam 1-1/2" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '1-1/2" Sch40 CS',
  },
  {
    code: 'PIPE 1-1/2" SCH40 GALV',
    name: 'Pipa Baja Galvanis 1-1/2" Sch 40 (OD 48.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 245000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '48.3',
    defaultD2: '3.68',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 4.05,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Vent Tanki / Handrail Galvanis 1-1/2" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '1-1/2" Sch40 Galv',
  },
  {
    code: 'PIPE 1-1/2" SCH80 CS',
    name: 'Pipa Baja Hitam 1-1/2" Sch 80 (OD 48.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 265000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '48.3',
    defaultD2: '5.08',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 5.41,
    isSteelTonnage: true,
    descriptionHint: 'Pipa High Pressure Fuel Line 1-1/2" Sch 80',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '1-1/2" Sch80 CS',
  },
  {
    code: 'PIPE 1-1/2" SCH80 GALV',
    name: 'Pipa Baja Galvanis 1-1/2" Sch 80 (OD 48.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 325000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '48.3',
    defaultD2: '5.08',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 5.41,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Deck Fire Line Galvanis 1-1/2" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '1-1/2" Sch80 Galv',
  },

  // --- 2" ---
  {
    code: 'PIPE 2" SCH40',
    name: 'Pipa Baja Hitam 2" Sch 40 (OD 60.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 260000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '60.3',
    defaultD2: '3.91',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 5.44,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Ballast / Bilge Line 2" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '2" Sch40 CS',
  },
  {
    code: 'PIPE 2" SCH40 GALV',
    name: 'Pipa Baja Galvanis 2" Sch 40 (OD 60.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 330000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '60.3',
    defaultD2: '3.91',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 5.44,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Vent / Deck Line Galvanis 2" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '2" Sch40 Galv',
  },
  {
    code: 'PIPE 2" SCH80',
    name: 'Pipa Baja Hitam Tebal 2" Sch 80 (OD 60.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 365000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '60.3',
    defaultD2: '5.54',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 7.48,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Hydraulic High Pressure 2" Sch 80',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '2" Sch80 CS',
  },
  {
    code: 'PIPE 2" SCH80 GALV',
    name: 'Pipa Baja Galvanis 2" Sch 80 (OD 60.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 450000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '60.3',
    defaultD2: '5.54',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 7.48,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water High Pressure Galvanis 2" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '2" Sch80 Galv',
  },

  // --- 2-1/2" ---
  {
    code: 'PIPE 2-1/2" SCH40',
    name: 'Pipa Baja Hitam 2-1/2" Sch 40 (OD 73.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 415000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '73.0',
    defaultD2: '5.16',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 8.63,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Fire Line / Sea Water 2-1/2" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '2.5" Sch40 CS',
  },
  {
    code: 'PIPE 2-1/2" SCH40 GALV',
    name: 'Pipa Baja Galvanis 2-1/2" Sch 40 (OD 73.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 518000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '73.0',
    defaultD2: '5.16',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 8.63,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Pemadam Fire Main Galvanis 2-1/2" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '2.5" Sch40 Galv',
  },
  {
    code: 'PIPE 2-1/2" SCH80 CS',
    name: 'Pipa Baja Hitam 2-1/2" Sch 80 (OD 73.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 550000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '73.0',
    defaultD2: '7.01',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 11.41,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Fuel Cargo Heavy Duty 2-1/2" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '2.5" Sch80 CS',
  },
  {
    code: 'PIPE 2-1/2" SCH80 GALV',
    name: 'Pipa Baja Galvanis 2-1/2" Sch 80 (OD 73.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 685000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '73.0',
    defaultD2: '7.01',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 11.41,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Deck Line Galvanis 2-1/2" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '2.5" Sch80 Galv',
  },

  // --- 3" ---
  {
    code: 'PIPE 3" SCH40',
    name: 'Pipa Baja Hitam 3" Sch 40 (OD 88.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 540000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '88.9',
    defaultD2: '5.49',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 11.29,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Cooling Water / Ballast 3" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '3" Sch40 CS',
  },
  {
    code: 'PIPE 3" SCH40 GALV',
    name: 'Pipa Baja Galvanis 3" Sch 40 (OD 88.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 678000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '88.9',
    defaultD2: '5.49',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 11.29,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Laut / Scupper Galvanis 3" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '3" Sch40 Galv',
  },
  {
    code: 'PIPE 3" SCH80',
    name: 'Pipa Baja Hitam Tebal 3" Sch 80 (OD 88.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 730000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '88.9',
    defaultD2: '7.62',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 15.27,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Fuel Cargo / High Pressure 3" Sch 80',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '3" Sch80 CS',
  },
  {
    code: 'PIPE 3" SCH80 GALV',
    name: 'Pipa Baja Galvanis 3" Sch 80 (OD 88.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 915000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '88.9',
    defaultD2: '7.62',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 15.27,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Fire Main Deck Galvanis 3" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '3" Sch80 Galv',
  },

  // --- 3-1/2" ---
  {
    code: 'PIPE 3-1/2" SCH40 CS',
    name: 'Pipa Baja Hitam 3-1/2" Sch 40 (OD 101.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 650000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '101.6',
    defaultD2: '5.74',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 13.57,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Exhaust / Discharge Line 3-1/2" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '3.5" Sch40 CS',
  },
  {
    code: 'PIPE 3-1/2" SCH40 GALV',
    name: 'Pipa Baja Galvanis 3-1/2" Sch 40 (OD 101.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 815000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '101.6',
    defaultD2: '5.74',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 13.57,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Galvanis 3-1/2" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '3.5" Sch40 Galv',
  },
  {
    code: 'PIPE 3-1/2" SCH80 CS',
    name: 'Pipa Baja Hitam 3-1/2" Sch 80 (OD 101.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 890000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '101.6',
    defaultD2: '8.08',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 18.64,
    isSteelTonnage: true,
    descriptionHint: 'Pipa High Pressure Cargo CS 3-1/2" Sch 80',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '3.5" Sch80 CS',
  },
  {
    code: 'PIPE 3-1/2" SCH80 GALV',
    name: 'Pipa Baja Galvanis 3-1/2" Sch 80 (OD 101.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1115000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '101.6',
    defaultD2: '8.08',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 18.64,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Deck Fire Line Galvanis 3-1/2" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '3.5" Sch80 Galv',
  },

  // --- 4" ---
  {
    code: 'PIPE 4" SCH40',
    name: 'Pipa Baja Hitam 4" Sch 40 (OD 114.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 770000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '114.3',
    defaultD2: '6.02',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 16.07,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest / Main Overboard 4" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '4" Sch40 CS',
  },
  {
    code: 'PIPE 4" SCH40 GALV',
    name: 'Pipa Baja Galvanis 4" Sch 40 (OD 114.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 960000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '114.3',
    defaultD2: '6.02',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 16.07,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Laut / Main Fire Line Galvanis 4" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '4" Sch40 Galv',
  },
  {
    code: 'PIPE 4" SCH80 CS',
    name: 'Pipa Baja Hitam 4" Sch 80 (OD 114.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1070000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '114.3',
    defaultD2: '8.56',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 22.32,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Cargo Oil / High Pressure Suction 4" Sch 80',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '4" Sch80 CS',
  },
  {
    code: 'PIPE 4" SCH80 GALV',
    name: 'Pipa Baja Galvanis 4" Sch 80 (OD 114.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1340000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '114.3',
    defaultD2: '8.56',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 22.32,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Deck Galvanis 4" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '4" Sch80 Galv',
  },

  // --- 5" ---
  {
    code: 'PIPE 5" SCH40 CS',
    name: 'Pipa Baja Hitam 5" Sch 40 (OD 141.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1040000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '141.3',
    defaultD2: '6.55',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 21.77,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Cooling / Overboard 5" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '5" Sch40 CS',
  },
  {
    code: 'PIPE 5" SCH40 GALV',
    name: 'Pipa Baja Galvanis 5" Sch 40 (OD 141.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1300000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '141.3',
    defaultD2: '6.55',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 21.77,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Laut Main Line Galvanis 5" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '5" Sch40 Galv',
  },
  {
    code: 'PIPE 5" SCH80 CS',
    name: 'Pipa Baja Hitam 5" Sch 80 (OD 141.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1480000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '141.3',
    defaultD2: '9.53',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 30.94,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Cargo Oil Main Suction CS 5" Sch 80',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '5" Sch80 CS',
  },
  {
    code: 'PIPE 5" SCH80 GALV',
    name: 'Pipa Baja Galvanis 5" Sch 80 (OD 141.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1850000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '141.3',
    defaultD2: '9.53',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 30.94,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Heavy Duty Galvanis 5" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '5" Sch80 Galv',
  },

  // --- 6" ---
  {
    code: 'PIPE 6" SCH40',
    name: 'Pipa Baja Hitam 6" Sch 40 (OD 168.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1350000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '168.3',
    defaultD2: '7.11',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 28.26,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Sea Chest Suction 6" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '6" Sch40 CS',
  },
  {
    code: 'PIPE 6" SCH40 GALV',
    name: 'Pipa Baja Galvanis 6" Sch 40 (OD 168.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1690000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '168.3',
    defaultD2: '7.11',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 28.26,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Ballast / Air Laut Galvanis 6" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '6" Sch40 Galv',
  },
  {
    code: 'PIPE 6" SCH80 CS',
    name: 'Pipa Baja Hitam 6" Sch 80 (OD 168.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 2040000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '168.3',
    defaultD2: '10.97',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 42.56,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Cargo / Mud Line 6" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '6" Sch80 CS',
  },
  {
    code: 'PIPE 6" SCH80 GALV',
    name: 'Pipa Baja Galvanis 6" Sch 80 (OD 168.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 2550000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '168.3',
    defaultD2: '10.97',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 42.56,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Header Galvanis 6" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '6" Sch80 Galv',
  },

  // --- 8" ---
  {
    code: 'PIPE 8" SCH40 CS',
    name: 'Pipa Baja Hitam 8" Sch 40 (OD 219.1 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 2040000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '219.1',
    defaultD2: '8.18',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 42.55,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Ballast / Cargo Suction 8" Sch 40',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '8" Sch40 CS',
  },
  {
    code: 'PIPE 8" SCH40 GALV',
    name: 'Pipa Baja Galvanis 8" Sch 40 (OD 219.1 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 2550000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '219.1',
    defaultD2: '8.18',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 42.55,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Sea Water Header Galvanis 8" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '8" Sch40 Galv',
  },
  {
    code: 'PIPE 8" SCH80 CS',
    name: 'Pipa Baja Hitam 8" Sch 80 (OD 219.1 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 3100000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '219.1',
    defaultD2: '12.70',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 64.64,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Cargo Oil Heavy Duty 8" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '8" Sch80 CS',
  },
  {
    code: 'PIPE 8" SCH80 GALV',
    name: 'Pipa Baja Galvanis 8" Sch 80 (OD 219.1 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 3875000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '219.1',
    defaultD2: '12.70',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 64.64,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Deck Galvanis 8" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '8" Sch80 Galv',
  },

  // --- 10" ---
  {
    code: 'PIPE 10" SCH40 CS',
    name: 'Pipa Baja Hitam 10" Sch 40 (OD 273.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 2900000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '273.0',
    defaultD2: '9.27',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 60.31,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Cargo Main Line / Ballast 10" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '10" Sch40 CS',
  },
  {
    code: 'PIPE 10" SCH40 GALV',
    name: 'Pipa Baja Galvanis 10" Sch 40 (OD 273.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 3620000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '273.0',
    defaultD2: '9.27',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 60.31,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Suction Galvanis 10" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '10" Sch40 Galv',
  },
  {
    code: 'PIPE 10" SCH80 CS',
    name: 'Pipa Baja Hitam 10" Sch 80 (OD 273.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 4600000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '273.0',
    defaultD2: '15.09',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 95.97,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Heavy Cargo Line 10" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '10" Sch80 CS',
  },
  {
    code: 'PIPE 10" SCH80 GALV',
    name: 'Pipa Baja Galvanis 10" Sch 80 (OD 273.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 5750000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '273.0',
    defaultD2: '15.09',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 95.97,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest Main Header Galvanis 10" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '10" Sch80 Galv',
  },

  // --- 12" ---
  {
    code: 'PIPE 12" SCH40 CS',
    name: 'Pipa Baja Hitam 12" Sch 40 (OD 323.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 3820000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '323.9',
    defaultD2: '10.31',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 79.73,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest / Main Suction 12" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '12" Sch40 CS',
  },
  {
    code: 'PIPE 12" SCH40 GALV',
    name: 'Pipa Baja Galvanis 12" Sch 40 (OD 323.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 4780000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '323.9',
    defaultD2: '10.31',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 79.73,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Header Galvanis 12" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '12" Sch40 Galv',
  },
  {
    code: 'PIPE 12" SCH80 CS',
    name: 'Pipa Baja Hitam 12" Sch 80 (OD 323.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 6330000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '323.9',
    defaultD2: '17.48',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 132.08,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Heavy Cargo Oil Main Line 12" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '12" Sch80 CS',
  },
  {
    code: 'PIPE 12" SCH80 GALV',
    name: 'Pipa Baja Galvanis 12" Sch 80 (OD 323.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 7920000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '323.9',
    defaultD2: '17.48',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 132.08,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest / Sea Water Header Galvanis 12" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '12" Sch80 Galv',
  },

  // --- 14" ---
  {
    code: 'PIPE 14" SCH40 CS',
    name: 'Pipa Baja Hitam 14" Sch 40 (OD 355.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 4530000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '355.6',
    defaultD2: '11.13',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 94.55,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Sea Chest Suction 14" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '14" Sch40 CS',
  },
  {
    code: 'PIPE 14" SCH40 GALV',
    name: 'Pipa Baja Galvanis 14" Sch 40 (OD 355.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 5670000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '355.6',
    defaultD2: '11.13',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 94.55,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Header Galvanis 14" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '14" Sch40 Galv',
  },
  {
    code: 'PIPE 14" SCH80 CS',
    name: 'Pipa Baja Hitam 14" Sch 80 (OD 355.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 7580000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '355.6',
    defaultD2: '19.05',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 158.10,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Heavy Duty Cargo Header 14" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '14" Sch80 CS',
  },
  {
    code: 'PIPE 14" SCH80 GALV',
    name: 'Pipa Baja Galvanis 14" Sch 80 (OD 355.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 9480000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '355.6',
    defaultD2: '19.05',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 158.10,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Sea Water Header Galvanis 14" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '14" Sch80 Galv',
  },

  // --- 16" ---
  {
    code: 'PIPE 16" SCH40 CS',
    name: 'Pipa Baja Hitam 16" Sch 40 (OD 406.4 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 5900000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '406.4',
    defaultD2: '12.70',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 123.30,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Sea Chest Suction 16" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '16" Sch40 CS',
  },
  {
    code: 'PIPE 16" SCH40 GALV',
    name: 'Pipa Baja Galvanis 16" Sch 40 (OD 406.4 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 7390000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '406.4',
    defaultD2: '12.70',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 123.30,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Air Laut / Main Header Galvanis 16" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '16" Sch40 Galv',
  },
  {
    code: 'PIPE 16" SCH80 CS',
    name: 'Pipa Baja Hitam 16" Sch 80 (OD 406.4 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 9760000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '406.4',
    defaultD2: '21.44',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 203.53,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Heavy Duty Cargo Main Line 16" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '16" Sch80 CS',
  },
  {
    code: 'PIPE 16" SCH80 GALV',
    name: 'Pipa Baja Galvanis 16" Sch 80 (OD 406.4 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 12200000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '406.4',
    defaultD2: '21.44',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 203.53,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest Main Suction Galvanis 16" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '16" Sch80 Galv',
  },

  // --- 18" ---
  {
    code: 'PIPE 18" SCH40 CS',
    name: 'Pipa Baja Hitam 18" Sch 40 (OD 457.2 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 7470000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '457.2',
    defaultD2: '14.27',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 155.80,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Sea Chest / Dredging Line 18" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '18" Sch40 CS',
  },
  {
    code: 'PIPE 18" SCH40 GALV',
    name: 'Pipa Baja Galvanis 18" Sch 40 (OD 457.2 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 9340000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '457.2',
    defaultD2: '14.27',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 155.80,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Discharge Line Galvanis 18" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '18" Sch40 Galv',
  },
  {
    code: 'PIPE 18" SCH80 CS',
    name: 'Pipa Baja Hitam 18" Sch 80 (OD 457.2 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 12200000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '457.2',
    defaultD2: '23.83',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 254.55,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Heavy Duty Cargo Header 18" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '18" Sch80 CS',
  },
  {
    code: 'PIPE 18" SCH80 GALV',
    name: 'Pipa Baja Galvanis 18" Sch 80 (OD 457.2 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 15200000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '457.2',
    defaultD2: '23.83',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 254.55,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Suction Galvanis 18" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '18" Sch80 Galv',
  },

  // --- 20" ---
  {
    code: 'PIPE 20" SCH40 CS',
    name: 'Pipa Baja Hitam 20" Sch 40 (OD 508.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 8800000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '508.0',
    defaultD2: '15.09',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 183.42,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest / Main Suction Line 20" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '20" Sch40 CS',
  },
  {
    code: 'PIPE 20" SCH40 GALV',
    name: 'Pipa Baja Galvanis 20" Sch 40 (OD 508.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 11000000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '508.0',
    defaultD2: '15.09',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 183.42,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Header Galvanis 20" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '20" Sch40 Galv',
  },
  {
    code: 'PIPE 20" SCH80 CS',
    name: 'Pipa Baja Hitam 20" Sch 80 (OD 508.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 14900000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '508.0',
    defaultD2: '26.19',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 311.18,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Dredging / Cargo Suction 20" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '20" Sch80 CS',
  },
  {
    code: 'PIPE 20" SCH80 GALV',
    name: 'Pipa Baja Galvanis 20" Sch 80 (OD 508.0 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 18600000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '508.0',
    defaultD2: '26.19',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 311.18,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest Main Suction Galvanis 20" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '20" Sch80 Galv',
  },

  // --- 22" ---
  {
    code: 'PIPE 22" SCH40 CS',
    name: 'Pipa Baja Hitam 22" Sch 40 (OD 558.8 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 10200000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '558.8',
    defaultD2: '15.88',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 212.67,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Heavy Main Discharge 22" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '22" Sch40 CS',
  },
  {
    code: 'PIPE 22" SCH40 GALV',
    name: 'Pipa Baja Galvanis 22" Sch 40 (OD 558.8 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 12750000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '558.8',
    defaultD2: '15.88',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 212.67,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Line Galvanis 22" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '22" Sch40 Galv',
  },
  {
    code: 'PIPE 22" SCH80 CS',
    name: 'Pipa Baja Hitam 22" Sch 80 (OD 558.8 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 17900000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '558.8',
    defaultD2: '28.58',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 373.85,
    isSteelTonnage: true,
    descriptionHint: 'Pipa High Pressure Dredging 22" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '22" Sch80 CS',
  },
  {
    code: 'PIPE 22" SCH80 GALV',
    name: 'Pipa Baja Galvanis 22" Sch 80 (OD 558.8 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 22400000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '558.8',
    defaultD2: '28.58',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 373.85,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest Heavy Galvanis 22" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '22" Sch80 Galv',
  },

  // --- 24" ---
  {
    code: 'PIPE 24" SCH40 CS',
    name: 'Pipa Baja Hitam 24" Sch 40 (OD 609.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 12200000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '609.6',
    defaultD2: '17.48',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 255.03,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Sea Chest / Discharge 24" Sch 40 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '24" Sch40 CS',
  },
  {
    code: 'PIPE 24" SCH40 GALV',
    name: 'Pipa Baja Galvanis 24" Sch 40 (OD 609.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 15300000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '609.6',
    defaultD2: '17.48',
    defaultD3: 'Sch 40',
    weightPerMeterKg: 255.03,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Water Main Header Galvanis 24" Sch 40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '24" Sch40 Galv',
  },
  {
    code: 'PIPE 24" SCH80 CS',
    name: 'Pipa Baja Hitam 24" Sch 80 (OD 609.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 21100000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '609.6',
    defaultD2: '30.96',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 441.50,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Main Dredging / Heavy Suction 24" Sch 80 CS',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: '24" Sch80 CS',
  },
  {
    code: 'PIPE 24" SCH80 GALV',
    name: 'Pipa Baja Galvanis 24" Sch 80 (OD 609.6 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 26400000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '609.6',
    defaultD2: '30.96',
    defaultD3: 'Sch 80',
    weightPerMeterKg: 441.50,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Sea Chest Main Suction Heavy Galvanis 24" Sch 80',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: '24" Sch80 Galv',
  },

  // --- SPECIAL PIPES & FITTINGS (STAINLESS, CUNI, FLANGES) ---
  {
    code: 'PIPE SS316L 2" SCH40',
    name: 'Pipa Stainless Steel SUS 316L 2" Sch 40S (OD 60.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 450000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '60.3',
    defaultD2: '3.91',
    defaultD3: 'Sch 40S',
    weightPerMeterKg: 5.51,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Stainless Steel SUS 316L Cargo Line Tanker Chemical',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: '2" SS316L',
  },
  {
    code: 'PIPE SS316L 3" SCH40',
    name: 'Pipa Stainless Steel SUS 316L 3" Sch 40S (OD 88.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 750000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '88.9',
    defaultD2: '5.49',
    defaultD3: 'Sch 40S',
    weightPerMeterKg: 11.47,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Stainless Steel SUS 316L Tanker Cargo Oil / Fuel Line',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: '3" SS316L',
  },
  {
    code: 'PIPE SS316L 4" SCH40',
    name: 'Pipa Stainless Steel SUS 316L 4" Sch 40S (OD 114.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1150000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Sch',
    d4Label: 'P (mm)',
    defaultD1: '114.3',
    defaultD2: '6.02',
    defaultD3: 'Sch 40S',
    weightPerMeterKg: 16.32,
    isSteelTonnage: true,
    descriptionHint: 'Pipa Stainless Steel SUS 316L Heavy Cargo Line Tanker',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: '4" SS316L',
  },
  {
    code: 'PIPE CUNI 2" SCH10',
    name: 'Pipa Cupronickel CuNi 90/10 2" (OD 60.3 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 650000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Class',
    d4Label: 'P (mm)',
    defaultD1: '60.3',
    defaultD2: '2.50',
    defaultD3: 'CuNi 90/10',
    weightPerMeterKg: 4.05,
    isSteelTonnage: false,
    descriptionHint: 'Pipa Tembaga-Nikel CuNi 90/10 Pendingin Air Laut Main Engine',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: '2" CuNi',
  },
  {
    code: 'PIPE CUNI 3" SCH10',
    name: 'Pipa Cupronickel CuNi 90/10 3" (OD 88.9 mm)',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'm',
    defaultUnitPrice: 1100000,
    d1Label: 'OD (mm)',
    d2Label: 'WT (mm)',
    d3Label: 'Class',
    d4Label: 'P (mm)',
    defaultD1: '88.9',
    defaultD2: '3.00',
    defaultD3: 'CuNi 90/10',
    weightPerMeterKg: 7.22,
    isSteelTonnage: false,
    descriptionHint: 'Pipa Tembaga-Nikel CuNi 90/10 Sea Water Cooling Main Line',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: '3" CuNi',
  },
  {
    code: 'FLANGE CS 2" JIS10K',
    name: 'Flange Steel 2" JIS 10K FF/RF Las',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'pcs',
    defaultUnitPrice: 250000,
    isSteelTonnage: false,
    descriptionHint: 'Flange Carbon Steel 2" JIS 10K Sambungan Pipa',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'Flange 2"',
  },
  {
    code: 'FLANGE CS 3" JIS10K',
    name: 'Flange Steel 3" JIS 10K FF/RF Las',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'pcs',
    defaultUnitPrice: 380000,
    isSteelTonnage: false,
    descriptionHint: 'Flange Carbon Steel 3" JIS 10K Sambungan Pipa',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'Flange 3"',
  },
  {
    code: 'FLANGE CS 4" JIS10K',
    name: 'Flange Steel 4" JIS 10K FF/RF Las',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'pcs',
    defaultUnitPrice: 520000,
    isSteelTonnage: false,
    descriptionHint: 'Flange Carbon Steel 4" JIS 10K Sambungan Pipa',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'Flange 4"',
  },
  {
    code: 'FLANGE CS 6" JIS10K',
    name: 'Flange Steel 6" JIS 10K FF/RF Las',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'pcs',
    defaultUnitPrice: 950000,
    isSteelTonnage: false,
    descriptionHint: 'Flange Carbon Steel 6" JIS 10K Sambungan Pipa',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'Flange 6"',
  },
  {
    code: 'ELBOW CS 3" SCH40',
    name: 'Elbow 90° Seamless Steel 3" Sch 40',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'pcs',
    defaultUnitPrice: 145000,
    isSteelTonnage: false,
    descriptionHint: 'Elbow 90 Derajat Carbon Steel 3" Sch 40 Las',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'Elbow 3"',
  },
  {
    code: 'ELBOW CS 4" SCH40',
    name: 'Elbow 90° Seamless Steel 4" Sch 40',
    category: 'pipe',
    categoryLabel: 'Pipa Baja',
    defaultUnit: 'pcs',
    defaultUnitPrice: 240000,
    isSteelTonnage: false,
    descriptionHint: 'Elbow 90 Derajat Carbon Steel 4" Sch 40 Las',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'Elbow 4"',
  },

  // --- 3. PROFIL KONSTRUKSI (PROFILES & STRUCTURAL) ---
  {
    code: 'L 50x50x5',
    name: 'Angle Bar / Besi Siku L 50x50x5 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '50',
    defaultD2: '50',
    defaultD3: '5',
    weightPerMeterKg: 3.77,
    isSteelTonnage: true,
    descriptionHint: 'Gading-gading / Frame Penguat Besi Siku L 50x50x5',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'Siku 50',
  },
  {
    code: 'L 65x65x6',
    name: 'Angle Bar / Besi Siku L 65x65x6 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '65',
    defaultD2: '65',
    defaultD3: '6',
    weightPerMeterKg: 5.91,
    isSteelTonnage: true,
    descriptionHint: 'Stiffener Sekat / Frame Siku L 65x65x6',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'Siku 65',
  },
  {
    code: 'L 75x75x6',
    name: 'Angle Bar / Besi Siku L 75x75x6 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '75',
    defaultD2: '75',
    defaultD3: '6',
    weightPerMeterKg: 6.85,
    isSteelTonnage: true,
    descriptionHint: 'Penguat Dek / Side Girder Siku L 75x75x6',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'Siku 75',
  },
  {
    code: 'L 100x100x10',
    name: 'Angle Bar / Besi Siku L 100x100x10 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '100',
    defaultD2: '100',
    defaultD3: '10',
    weightPerMeterKg: 15.10,
    isSteelTonnage: true,
    descriptionHint: 'Profil Heavy Angle L 100x100x10 Konstruksi Geladak',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'Siku 100',
  },

  // --- SIKU BEDA SISI (UNEQUAL ANGLE BAR) ---
  {
    code: 'L 75x50x6 (UNEQUAL)',
    name: 'Angle Bar / Besi Siku Beda Sisi L 75x50x6 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 49500,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '75',
    defaultD2: '50',
    defaultD3: '6',
    weightPerMeterKg: 5.62,
    isSteelTonnage: true,
    descriptionHint: 'Besi Siku Tidak Sama Sisi L 75x50x6 mm Bulwark Stay / Stiffener',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'Siku 75x50',
  },
  {
    code: 'L 100x75x10 (UNEQUAL)',
    name: 'Angle Bar / Besi Siku Beda Sisi L 100x75x10 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 49500,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '100',
    defaultD2: '75',
    defaultD3: '10',
    weightPerMeterKg: 13.00,
    isSteelTonnage: true,
    descriptionHint: 'Besi Siku Tidak Sama Sisi L 100x75x10 mm Web Frame Stiffener',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'Siku 100x75',
  },
  {
    code: 'L 125x75x10 (UNEQUAL)',
    name: 'Angle Bar / Besi Siku Beda Sisi L 125x75x10 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 49500,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '125',
    defaultD2: '75',
    defaultD3: '10',
    weightPerMeterKg: 14.90,
    isSteelTonnage: true,
    descriptionHint: 'Besi Siku Tidak Sama Sisi L 125x75x10 mm Longitudinal Girder',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'Siku 125x75',
  },
  {
    code: 'L 150x90x12 (UNEQUAL)',
    name: 'Angle Bar / Besi Siku Beda Sisi L 150x90x12 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 51000,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '150',
    defaultD2: '90',
    defaultD3: '12',
    weightPerMeterKg: 21.60,
    isSteelTonnage: true,
    descriptionHint: 'Besi Siku Tidak Sama Sisi L 150x90x12 mm Bottom Frame / Side Stringer',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'Siku 150x90',
  },
  {
    code: 'L 200x100x12 (UNEQUAL)',
    name: 'Angle Bar / Besi Siku Beda Sisi L 200x100x12 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 51000,
    d1Label: 'Sisi 1 (mm)',
    d2Label: 'Sisi 2 (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '200',
    defaultD2: '100',
    defaultD3: '12',
    weightPerMeterKg: 27.30,
    isSteelTonnage: true,
    descriptionHint: 'Besi Siku Tidak Sama Sisi L 200x100x12 mm Heavy Deck Beam',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'Siku 200x100',
  },
  {
    code: 'FB 50x4.5',
    name: 'Flat Bar / Plat Strip 50x4.5 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Lebar (mm)',
    d2Label: 'Tebal (mm)',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '50',
    defaultD2: '4.5',
    weightPerMeterKg: 1.77,
    isSteelTonnage: true,
    descriptionHint: 'Face Plate / Penumpu Flat Bar 50x4.5 mm',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'FB 50x4.5',
  },
  {
    code: 'FB 75x12',
    name: 'Flat Bar / Plat Strip 75x12 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Lebar (mm)',
    d2Label: 'Tebal (mm)',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '75',
    defaultD2: '12',
    weightPerMeterKg: 7.07,
    isSteelTonnage: true,
    descriptionHint: 'Penumpu Stiffener Flat Bar 75x12 mm',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'FB 75x12',
  },
  {
    code: 'FB 100x12',
    name: 'Flat Bar / Face Plate 100x12 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Lebar (mm)',
    d2Label: 'Tebal (mm)',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '100',
    defaultD2: '12',
    weightPerMeterKg: 9.42,
    isSteelTonnage: true,
    descriptionHint: 'Face Plate Girder Flat Bar 100x12 mm',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'FB 100x12',
  },
  {
    code: 'UNP 100',
    name: 'Channel Bar / Kanal UNP 100x50x5 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Tinggi (mm)',
    d2Label: 'Lebar (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '100',
    defaultD2: '50',
    defaultD3: '5',
    weightPerMeterKg: 9.36,
    isSteelTonnage: true,
    descriptionHint: 'Penggantian Kanal UNP 100 Penumpu Dek / Pondasi',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'UNP 100',
  },
  {
    code: 'UNP 150',
    name: 'Channel Bar / Kanal UNP 150x75x6.5 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Tinggi (mm)',
    d2Label: 'Lebar (mm)',
    d3Label: 'Tebal (mm)',
    d4Label: 'P (mm)',
    defaultD1: '150',
    defaultD2: '75',
    defaultD3: '6.5',
    weightPerMeterKg: 18.60,
    isSteelTonnage: true,
    descriptionHint: 'Pondasi Mesin / Cross Beam UNP 150',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'UNP 150',
  },
  {
    code: 'H 150x150',
    name: 'H-Beam 150x150x7x10 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 50000,
    d1Label: 'Tinggi (mm)',
    d2Label: 'Lebar (mm)',
    d3Label: 'Web/Flg',
    d4Label: 'P (mm)',
    defaultD1: '150',
    defaultD2: '150',
    weightPerMeterKg: 31.50,
    isSteelTonnage: true,
    descriptionHint: 'Pondasi Genset / Crane Pillar H-Beam 150x150',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'H-Beam 150',
  },
  {
    code: 'ROUND D25',
    name: 'Round Bar / As Besi Bulat D 25 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 49000,
    d1Label: 'Dia (mm)',
    d2Label: '-',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '25',
    weightPerMeterKg: 3.85,
    isSteelTonnage: true,
    descriptionHint: 'Pin Engsel / As Besi Round Bar D 25 mm',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'Round 25',
  },
  {
    code: 'ROUND D50',
    name: 'Round Bar / As Besi Bulat D 50 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 49000,
    d1Label: 'Dia (mm)',
    d2Label: '-',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '50',
    weightPerMeterKg: 15.41,
    isSteelTonnage: true,
    descriptionHint: 'Poros Roller / As Jangkar Round Bar D 50 mm',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'Round 50',
  },
  {
    code: 'SQUARE 16x16',
    name: 'Square Bar / Besi Nako Kotak 16x16 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 48000,
    d1Label: 'Sisi (mm)',
    d2Label: 'Sisi (mm)',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '16',
    defaultD2: '16',
    weightPerMeterKg: 2.01,
    isSteelTonnage: true,
    descriptionHint: 'Tangga Monyet / Handrail Nako Kotak 16x16',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'Nako 16',
  },

  // --- HOLLAND PROFILE (BULB FLAT HP BKI CLASS) ---
  {
    code: 'HP 100x6',
    name: 'Bulb Flat / Holland Profile HP 100x6 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 52000,
    d1Label: 'Tinggi (mm)',
    d2Label: 'Tebal (mm)',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '100',
    defaultD2: '6',
    weightPerMeterKg: 5.33,
    isSteelTonnage: true,
    descriptionHint: 'Gading-gading Lambung Bulb Flat Holland Profile HP 100x6 mm BKI',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'HP 100x6',
  },
  {
    code: 'HP 120x7',
    name: 'Bulb Flat / Holland Profile HP 120x7 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 52000,
    d1Label: 'Tinggi (mm)',
    d2Label: 'Tebal (mm)',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '120',
    defaultD2: '7',
    weightPerMeterKg: 7.56,
    isSteelTonnage: true,
    descriptionHint: 'Penguat Dek / Side Stiffener Bulb Flat HP 120x7 mm BKI',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'HP 120x7',
  },
  {
    code: 'HP 160x8',
    name: 'Bulb Flat / Holland Profile HP 160x8 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 52000,
    d1Label: 'Tinggi (mm)',
    d2Label: 'Tebal (mm)',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '160',
    defaultD2: '8',
    weightPerMeterKg: 11.80,
    isSteelTonnage: true,
    descriptionHint: 'Main Frame / Longitudinal Stiffener Bulb Flat HP 160x8 mm BKI',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'HP 160x8',
  },
  {
    code: 'HP 200x10',
    name: 'Bulb Flat / Holland Profile HP 200x10 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 52000,
    d1Label: 'Tinggi (mm)',
    d2Label: 'Tebal (mm)',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '200',
    defaultD2: '10',
    weightPerMeterKg: 19.00,
    isSteelTonnage: true,
    descriptionHint: 'Heavy Bottom Girder / Web Frame Stiffener Bulb Flat HP 200x10 mm',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'HP 200x10',
  },
  {
    code: 'ROUND SS316 D50',
    name: 'As Stainless Steel SUS 316L D 50 mm',
    category: 'profile',
    categoryLabel: 'Profil Konstruksi',
    defaultUnit: 'kg',
    defaultUnitPrice: 125000,
    d1Label: 'Dia (mm)',
    d2Label: '-',
    d3Label: '-',
    d4Label: 'P (mm)',
    defaultD1: '50',
    weightPerMeterKg: 15.66,
    isSteelTonnage: false,
    descriptionHint: 'As Poros Pompa / Shaft Valve Stainless Steel SUS 316L D 50mm',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'SS As 50',
  },

  // --- 4. JASA GALANGAN & DOCKING (SHIPYARD SERVICES & TARIFFS) ---
  {
    code: 'DOCKING TUG',
    name: 'Jasa Docking & Undocking Tug Boat / Kapal Tunda (<50m)',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'day',
    defaultUnitPrice: 4500000,
    isSteelTonnage: false,
    descriptionHint: 'Sewa Fasilitas Graving Dock / Slipway Kapal Tunda Tug Boat',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'Dock Tug',
  },
  {
    code: 'DOCKING BARGE',
    name: 'Jasa Docking & Undocking Tongkang / Barge 300ft',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'day',
    defaultUnitPrice: 7500000,
    isSteelTonnage: false,
    descriptionHint: 'Sewa Fasilitas Slipway / Graving Dock Tongkang Barge 300ft',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'Dock Barge',
  },
  {
    code: 'DOCKING TANKER',
    name: 'Jasa Docking & Undocking Kapal Tanker / Cargo (1500-5000 DWT)',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'day',
    defaultUnitPrice: 12500000,
    isSteelTonnage: false,
    descriptionHint: 'Sewa Fasilitas Graving Dock / Floating Dock Kapal Tanker',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'Dock Tanker',
  },
  {
    code: 'BLAST SA 2.5',
    name: 'Sandblasting Standar Spot / Full Sa 2.5 BKI',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'm²',
    defaultUnitPrice: 75000,
    isSteelTonnage: false,
    descriptionHint: 'Sandblasting Permukaan Pelat Lambung Standar Sa 2.5',
    badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    badgeText: 'Blast Sa2.5',
  },
  {
    code: 'BLAST SA 3.0',
    name: 'Sandblasting White Metal Sa 3.0 (Tangki Kargo)',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'm²',
    defaultUnitPrice: 1100000,
    isSteelTonnage: false,
    descriptionHint: 'Sandblasting Kualitas Bersih Total Sa 3.0 Khusus Tangki Kargo COT Tanker',
    badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    badgeText: 'Blast Sa3.0',
  },
  {
    code: 'BLAST SWEEP',
    name: 'Sweep Blasting / Flash Rust Removal',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'm²',
    defaultUnitPrice: 45000,
    isSteelTonnage: false,
    descriptionHint: 'Sweep Blasting Lambung & Bangunan Atas',
    badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    badgeText: 'Sweep',
  },
  {
    code: 'HP WASH',
    name: 'High Pressure Water Washing (350-500 Bar)',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'm²',
    defaultUnitPrice: 20000,
    isSteelTonnage: false,
    descriptionHint: 'Water Jet Cleaning Pembersihan Lumut Lambung Kapal',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: 'HP Wash',
  },
  {
    code: 'PAINT AC',
    name: 'Pengecatan Cat Primer Anti-Corrosive (AC) Spray',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'm²',
    defaultUnitPrice: 25000,
    isSteelTonnage: false,
    descriptionHint: 'Aplikasi Cat Anti-Corrosive (AC) 1 Lapis Airless Spray',
    badgeBg: 'bg-green-100 text-green-800 border-green-200',
    badgeText: 'Cat AC',
  },
  {
    code: 'PAINT AF',
    name: 'Pengecatan Cat Anti-Fouling (AF Finish) Spray',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'm²',
    defaultUnitPrice: 35000,
    isSteelTonnage: false,
    descriptionHint: 'Aplikasi Cat Anti-Fouling (AF) Finish Airless Spray',
    badgeBg: 'bg-green-100 text-green-800 border-green-200',
    badgeText: 'Cat AF',
  },
  {
    code: 'PAINT PURE EPOXY',
    name: 'Pengecatan Pure Epoxy 3-Lapis Tangki Kargo Tanker',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'm²',
    defaultUnitPrice: 95000,
    isSteelTonnage: false,
    descriptionHint: 'Pengecatan 3-Lapis Pure Epoxy Khusus Tangki Minyak / Chemical Tanker',
    badgeBg: 'bg-green-100 text-green-800 border-green-200',
    badgeText: 'Pure Epoxy',
  },
  {
    code: 'ZINC ANODE ZP5',
    name: 'Pemasangan Zinc Anode ZP-5 (5 kg) Las Lambung',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'pcs',
    defaultUnitPrice: 380000,
    isSteelTonnage: false,
    descriptionHint: 'Penggantian Zinc Anode ZP-5 Katodik Proteksi Lambung',
    badgeBg: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    badgeText: 'Anode ZP-5',
  },
  {
    code: 'ZINC ANODE ZP10',
    name: 'Pemasangan Zinc Anode ZP-10 (10 kg) Las Lambung',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'pcs',
    defaultUnitPrice: 680000,
    isSteelTonnage: false,
    descriptionHint: 'Penggantian Zinc Anode Heavy ZP-10 Katodik Proteksi Lambung',
    badgeBg: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    badgeText: 'Anode ZP-10',
  },
  {
    code: 'TANK CLEANING',
    name: 'Cleaning, Butterworth Wash & Chemical Gas Freeing Tanki',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'tank',
    defaultUnitPrice: 15000000,
    isSteelTonnage: false,
    descriptionHint: 'Pembersihan Tangki Kargo COT, Butterworth Washing & Gas Freeing Sertifikasi Marine',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'Gas Freeing',
  },
  {
    code: 'SLUDGE REMOVAL',
    name: 'Pembuangan Limbah Sludge / Oil Mud (MARPOL Annex I)',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'ton',
    defaultUnitPrice: 1800000,
    isSteelTonnage: false,
    descriptionHint: 'Penyedotan & Pengolahan Limbah Sludge Minyak Bersertifikat MARPOL Annex I',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'MARPOL Sludge',
  },
  {
    code: 'VALVE OH',
    name: 'Overhaul, Lapping & Pressure Test Sea Chest Valve',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'unit',
    defaultUnitPrice: 1250000,
    isSteelTonnage: false,
    descriptionHint: 'Overhaul, Grinding Valve Seat & Pressure Test Katup Laut',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'Valve',
  },
  {
    code: 'CARGO PUMP OH',
    name: 'Overhaul & Pressure Test Cargo Oil Pump (Screw/Centrifugal)',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'unit',
    defaultUnitPrice: 18500000,
    isSteelTonnage: false,
    descriptionHint: 'Overhaul Pompa Kargo Minyak, Penggantian Seal / Bearing & Test Tekanan',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'Cargo Pump',
  },
  {
    code: 'PROP POLISH',
    name: 'Pembersihan, Grinding & Polishing Daun Propeller',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'set',
    defaultUnitPrice: 4500000,
    isSteelTonnage: false,
    descriptionHint: 'Cleaning, Grinding & Polishing Baling-baling (Propeller)',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'Propeller',
  },
  {
    code: 'PROP BALANCE',
    name: 'Dynamic Balancing Propeller Baling-baling BKI Class',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'set',
    defaultUnitPrice: 8500000,
    isSteelTonnage: false,
    descriptionHint: 'Uji Keseimbangan Dinamis Baling-baling / Dynamic Balancing Sertifikat Class',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'Prop Balance',
  },
  {
    code: 'RUDDER CLR',
    name: 'Pengukuran, Overhaul & Re-bushing Rudder Stock Kemudi',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'set',
    defaultUnitPrice: 8500000,
    isSteelTonnage: false,
    descriptionHint: 'Overhaul Pintle, Dropping Rudder Stock & Penyetelan Kelonggaran Bushing Thordon',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'Rudder',
  },
  {
    code: 'SHAFT DRAW',
    name: 'Cabut, Periksa Micrometer & Pasang Tailshaft Poros Baling-Baling',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'set',
    defaultUnitPrice: 15000000,
    isSteelTonnage: false,
    descriptionHint: 'Cabut Poros Propeller, Inspeksi Stern Tube, Runout Test & Re-fit Poros',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'Shaft Draw',
  },
  {
    code: 'HYDROTEST',
    name: 'Hydrostatic / Pneumatic Pressure Test Tanki',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'au',
    defaultUnitPrice: 2500000,
    isSteelTonnage: false,
    descriptionHint: 'Hydrotest / Air Pressure Test Tanki Bersama Surveyor BKI',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'Hydrotest',
  },
  {
    code: 'AIR LEAK TEST',
    name: 'Pengujian Kebocoran Udara (Air Leak Test 0.2 Bar) 16 Void Tank',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'au',
    defaultUnitPrice: 8500000,
    isSteelTonnage: false,
    descriptionHint: 'Uji Kebocoran Tekanan Udara 0.2 Bar Seluruh Tanki Void Tongkang / Barge',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'Leak Test',
  },
  {
    code: 'NDT UT/MPI',
    name: 'Pengujian NDT UT Thickness Gauging & MPI Las Surveyor BKI',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'au',
    defaultUnitPrice: 1800000,
    isSteelTonnage: false,
    descriptionHint: 'NDT Ultrasonic Thickness Gauging & Magnetic Particle Test Las BKI',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'NDT UT/MPI',
  },
  {
    code: 'ME OVERHAUL',
    name: 'Major Overhaul Main Engine Mesin Utama Kapal (per Cyl)',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'cyl',
    defaultUnitPrice: 12000000,
    isSteelTonnage: false,
    descriptionHint: 'Major Overhaul Silinder Main Engine (Piston, Liner, Injector, Valve Grinding)',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'ME Overhaul',
  },
  {
    code: 'GENSET OH',
    name: 'Overhaul Auxiliary Engine Genset Kapal',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'unit',
    defaultUnitPrice: 15000000,
    isSteelTonnage: false,
    descriptionHint: 'Overhaul Mesin Bantu Genset Kapal, Calibration Injector & Test Load',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'Genset OH',
  },
  {
    code: 'LUMP SUM',
    name: 'Pekerjaan Borongan Umum / General Repair',
    category: 'service',
    categoryLabel: 'Jasa & Docking',
    defaultUnit: 'au',
    defaultUnitPrice: 5000000,
    isSteelTonnage: false,
    descriptionHint: 'Pekerjaan Borongan Khusus Galangan Kapal',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'Borongan',
  },
];

const STORAGE_KEY = 'shipyard_material_catalog_v7';

let _activeMaterialCatalog: MaterialTypeDefinition[] = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Reconcile missing catalog items from DEFAULT_MATERIAL_TYPE_CATALOG
          const missingItems = DEFAULT_MATERIAL_TYPE_CATALOG.filter(
            (defaultItem) => !parsed.some((existing: MaterialTypeDefinition) => existing.code.toUpperCase() === defaultItem.code.toUpperCase())
          );
          return [...parsed, ...missingItems];
        }
      }
    }
  } catch (e) {
    console.error('Failed to load material catalog from storage', e);
  }
  return [...DEFAULT_MATERIAL_TYPE_CATALOG];
})();

const _catalogListeners: Array<(catalog: MaterialTypeDefinition[]) => void> = [];

function notifyCatalogListeners() {
  _catalogListeners.forEach((cb) => {
    try {
      cb(_activeMaterialCatalog);
    } catch (e) {
      console.error('Error in catalog listener', e);
    }
  });
}

export const MATERIAL_TYPE_CATALOG = _activeMaterialCatalog;


