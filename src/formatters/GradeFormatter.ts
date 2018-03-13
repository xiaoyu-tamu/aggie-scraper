import R from 'ramda';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import PDFParser from 'pdf2json';
import { unescape } from 'querystring';
import { readFile, writeFile, getAllIndexes } from '../utils';
import { IGrade, ICollege, Term } from '../utils/interfaces';
import { DATA_DIR } from '../utils/constants';

const TO_DROP = 38;

export default class GradeFormatter {
  private filename = 'grade';
  private data: IGrade[][] = [];
  private semester: string;

  constructor(year = 2017, term = Term.Spring) {
    this.semester = '' + year + term;
  }

  async start() {
    const rawData: string[][] = await this.load();
    const removeWhiteSpace = R.when(R.test(/\d+/g), R.replace(/\s/g, ''));
    const formatter = R.compose(
      R.map(unescape), // unescapse html characters
      R.map(removeWhiteSpace) // remove spaces around number
    );

    console.log('📇   Formatting data...');
    const formatted: string[][] = rawData.map((data) => {
      return R.transduce(formatter, R.flip(R.append), [], data);
    });

    console.log('Extract College Total...');
    const colleges = R.map(this.toCollegeObject, formatted);

    console.log('🗑   Removing useless fields...');
    formatted.forEach((data) => {
      this.removeUselessFields(data);
    });

    console.log('🔮   Converting to Grade Object...');
    this.data = formatted.map((data) => {
      const t = R.splitEvery(20)(data);
      return R.map(this.toGradeObject, t);
    });

    console.log('👀   Validating...');
    this.data.forEach((list, i) => {
      this.validate(list, colleges[i]);
    });

    assert.equal(rawData.length, this.data.length);

    console.log('Saving...');
    await this.save();
  }

  private async save() {
    const filepath = `./data/${this.filename}-${this.semester}-formatted.json`;
    await writeFile(filepath, JSON.stringify(this.data));
    console.log(`🎊   ${this.filename} wrote to ${filepath} successfully!`);
  }

  private async load() {
    const filepath = path.join(DATA_DIR, `${this.filename}-${this.semester}-parsed.json`);
    const rawData = await readFile(filepath, 'utf8');
    return JSON.parse(rawData);
  }

  /**
   * ## Mutation
   *
   * Only course data left after purify.
   * @param data unformatted data
   */
  private removeUselessFields(data) {
    const courseIndexes = getAllIndexes(data, 'COURSE TOTAL:');
    for (let i = courseIndexes.length - 1; i >= 0; i--) {
      data.splice(courseIndexes[i], 19);
    }

    const departmentIndexes = getAllIndexes(data, 'DEPARTMENT TOTAL:');
    for (let i = departmentIndexes.length - 1; i >= 0; i--) {
      data.splice(departmentIndexes[i], 19);
    }

    const collegeIndexes = getAllIndexes(data, 'COLLEGE TOTAL:');
    for (let i = collegeIndexes.length - 1; i >= 0; i--) {
      data.splice(collegeIndexes[i], 19);
    }
  }

  /**
   * Validate formatted data to ensure consistance
   * @param src list of IGrade object
   * @param target college summary object
   */
  private validate(src: IGrade[], target: ICollege) {
    const reducer = (acc, item) => R.mergeWith(R.add, acc, item);

    const filteredObjs = src.map((obj) =>
      R.omit(['department', 'course', 'section', 'instructor', 'gpa'], obj)
    );

    const t = R.reduce(reducer, {}, filteredObjs);
    assert(R.equals(t, target));
  }

  /**
   * Convert raw data to formatted Grade object.
   * @param data unformatted data
   */
  private toGradeObjectV1(data: string[]): IGrade {
    const [department, course, section] = data[0].split('-');

    return {
      department,
      course,
      section,
      instructor: data[19],
      numOfStudent: +data[18],
      gpa: +data[12],
      a: +data[1],
      b: +data[3],
      c: +data[5],
      d: +data[7],
      f: +data[9],
      i: +data[13],
      s: +data[14],
      u: +data[15],
      q: +data[16],
      x: +data[17],
    };
  }

  /**
   * Extract college summary from raw data.
   * Used for validation.
   * @param data unformatted data
   */
  private toCollegeObjectV1(data: string[]): ICollege {
    const index = R.indexOf('COLLEGE TOTAL:', data);
    return {
      numOfStudent: +data[index + 18],
      a: +data[index + 1],
      b: +data[index + 3],
      c: +data[index + 5],
      d: +data[index + 7],
      f: +data[index + 9],
      i: +data[index + 13],
      s: +data[index + 14],
      u: +data[index + 15],
      q: +data[index + 16],
      x: +data[index + 17],
    };
  }
}
