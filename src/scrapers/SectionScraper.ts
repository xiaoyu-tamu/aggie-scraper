import puppeteer, { Page } from 'puppeteer';
import path from 'path';
import { writeFile } from '../utils';
import { IScraper, ISection } from '../utils/interfaces';
import { DATA_DIR } from '../utils/constants';
const CAS_HOMEPAGE =
  'https://cas.tamu.edu/cas/login?service=https://compass-sso.tamu.edu:443/ssomanager/c/SSB?pkg=bwykfcls.p_sel_crse_search;renew=true';
const CAS_USERNAME_SELECTOR = '#username';
const CAS_PASSWORD_SELECTOR = '#password';
const CAS_SUBMIT_SELECTOR = '#fm1 > button';
const USERNAME = 'lxyamerica';
const PASSWORD = '!Tamucsce';

const TERM_SUBMIT_SELECTOR = 'input[value="Submit"]';
const SUBJECT_OPTIONS_SELECTOR = '#subj_id > option';
const SUBJECT_SUBMIT_SELECTOR = 'input[name="SUB_BTN"]';

const COURSE_TABLE_ROW = '.datadisplaytable tr[style]';
const SECTION_TABLE = 'table.datadisplaytable';

export default class SectionScraper implements IScraper {
  begin: number;
  end: number;
  data: ISection[] = [];
  filename = `sections`;
  pauseTime = 500;
  constructor(begin: number, end: number) {
    this.begin = begin;
    this.end = end;
    console.log(`Department begin index: ${begin}`);
    console.log(`Department end index: ${end}`);
  }

  async start() {
    const browser = await puppeteer.launch({ timeout: 0 });
    const page = await browser.newPage();

    // go to Howdy home and login
    console.log('⌛️  Logging in...');
    await page.goto(CAS_HOMEPAGE);
    await page.type(CAS_USERNAME_SELECTOR, USERNAME, { delay: 100 });
    await page.click(CAS_SUBMIT_SELECTOR);
    await page.waitFor(CAS_PASSWORD_SELECTOR);
    await page.type(CAS_PASSWORD_SELECTOR, PASSWORD, { delay: 100 });
    await page.click(CAS_SUBMIT_SELECTOR);

    // go to term page and select semester
    console.log('⌛️  Navigating...');
    await page.waitFor(TERM_SUBMIT_SELECTOR);
    await page.click(TERM_SUBMIT_SELECTOR);

    const departmentList = await this.crawlDepartmentList(page);

    // Loop for each department
    for (let i = this.begin; i < this.end; i++) {
      console.log(`⌛️  Processing [ ${departmentList[i]} ] |  ${this.end - i} items left`);

      // go to department page
      await page.waitFor(SUBJECT_OPTIONS_SELECTOR);
      await page.waitFor(this.pauseTime);
      await page.click(`#subj_id > option[value=${departmentList[i]}]`);
      await page.click(SUBJECT_SUBMIT_SELECTOR);
      await page.waitFor(COURSE_TABLE_ROW);
      const courseCount = (await page.$$(COURSE_TABLE_ROW)).length;
      const sections: ISection[] = [];

      // Loop for each course in the department
      for (let i = 0; i < courseCount; i++) {
        // go to course page
        const submit = `table.datadisplaytable > tbody > tr:nth-child(${i +
          2}) > td:nth-child(4) > form > input[type="submit"]:nth-child(30)`;
        await page.waitFor(submit);
        await page.waitFor(this.pauseTime);
        await page.click(submit);

        // get section list information
        const sectionList = await this.crawlSectionList(page);

        sections.push(...sectionList);
        page.waitFor(this.pauseTime);
        await page.goBack(); // go back and process next course
      }

      this.data.push(...sections);
      await page.goBack(); // go back and process next department
    }
  }

  async save() {
    const filepath = path.join(DATA_DIR, `${this.filename}-parsed.json`);
    await writeFile(filepath, JSON.stringify(this.data));
  }

  private async crawlSectionList(page: Page): Promise<ISection[]> {
    await page.waitFor(SECTION_TABLE);

    const result: ISection[] = await page.evaluate((tableEl) => {
      const rows = Array.from(document.querySelector(tableEl).rows).slice(
        2
      ) as HTMLTableRowElement[];

      return rows.map((row) => {
        const cellsText = Array.from(row.cells).map((cell) => cell.innerText.trim());
        return {
          classes: 1,
          crn: cellsText[1],
          subject: cellsText[2],
          course: cellsText[3],
          section: cellsText[4],
          campus: cellsText[5],
          capacity: cellsText[10],
          days: [cellsText[8]],
          time: [cellsText[9]],
          instructor: [cellsText[13]],
          date: [cellsText[14]],
          location: [cellsText[15]],
          attribute: [cellsText[16]],
        };
      });
    }, SECTION_TABLE);

    return result;
  }

  private async crawlDepartmentList(page: Page): Promise<string[]> {
    await page.waitFor(SUBJECT_OPTIONS_SELECTOR);
    return await page.$$eval(SUBJECT_OPTIONS_SELECTOR, (options) => {
      return (Array.from(options) as HTMLInputElement[]).map((option) => {
        return option.value;
      });
    });
  }
}
