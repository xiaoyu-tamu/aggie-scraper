import puppeteer from 'puppeteer';
import path from 'path';
import { writeFile } from '../utils';
import { DATA_DIR } from '../constants';
import { IScraper } from '../interfaces';
const URLS = [
  'http://catalog.tamu.edu/undergraduate/course-descriptions/',
  'http://catalog.tamu.edu/graduate/course-descriptions/',
];
const SELECTOR = '#atozindex a';

export default class DepartmentScraper implements IScraper {
  data: string[] = [];
  filename = 'departments';

  async start() {
    const browser = await puppeteer.launch({ timeout: 0, headless: false });
    const page = await browser.newPage();

    const promises = URLS.map(async (url) => {
      await page.goto(url);
      return await page.$$eval(SELECTOR, (elements) =>
        Array.from(elements).map((element) => {
          const e = element as HTMLElement;
          return e.innerText;
        })
      );
    });

    this.data = await Promise.all(promises);
  }

  async save() {
    const filepath = path.join(DATA_DIR, `${this.filename}-parsed.json`);
    await writeFile(filepath, JSON.stringify(this.data));
  }
}
