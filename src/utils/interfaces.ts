export interface IScraper {
  filename: string;
  start(): void;
  save(): void;
}

export interface IFormatter {
  format(): void;
}

export interface ISection {
  classes: number;
  crn: string;
  subject: string;
  course: string;
  section: string;
  campus: string;
  title: string;
  capacity: string;
  days: string[];
  time: string[];
  instructor: string[];
  date: string[];
  location: string[];
  attribute: string[];
}

export interface IGrade {
  a: number;
  b: number;
  c: number;
  d: number;
  f: number;
  i: number;
  s: number;
  u: number;
  q: number;
  x: number;
  gpa: number;
  department: string;
  course: string;
  section: string;
  instructor: string;
  numOfStudent: number;
}

export interface ICollege {
  a: number;
  b: number;
  c: number;
  d: number;
  f: number;
  i: number;
  s: number;
  u: number;
  q: number;
  x: number;
  numOfStudent: number;
}

export enum Term {
  Spring = 1,
  Summer,
  Fall,
}
