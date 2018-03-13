import R from 'ramda';
import puppeteer from 'puppeteer';
import { readFile, writeFile } from '../utils';
import { IFormatter, ISection } from '../utils/interfaces';

export default class SectionFormatter implements IFormatter {
  private filename: string;
  private data: ISection[] = [];

  constructor({ filename = 'sections' } = {}) {
    this.filename = filename;
  }

  async format() {
    if (R.isEmpty(this.data)) {
      await this.load();
    }
    console.log(this.data.length);
    const formatted = this.removeDuplicate();

    this.data = formatted.map((curr) => {
      const { title, date, time, attribute, days } = curr;
      const parsedTime = time.map((item) => this.parseTime(item));
      const parsedDate = date.map((item) => this.parseDate(item));
      const parsedDays = days.map((item) => this.parseDays(item));
      const parsedAttribute = attribute.filter(Boolean)[0];
      return {
        ...curr,
        attribute: parsedAttribute,
        days: parsedDays,
        date: parsedDate,
        time: parsedTime,
      };
    });

    await this.save();
    console.log(this.data.length);
  }

  private async save() {
    const filepath = `./data/${this.filename + Date.now()}.json`;
    await writeFile(filepath, JSON.stringify(this.data), { flag: 'w' });
    console.log(`🎊   ${this.filename} wrote to ${filepath} successfully!`);
  }

  private async load() {
    const rawData = await readFile(`./data/${this.filename}.json`, 'utf8');
    this.data = JSON.parse(rawData) as ISection[];
  }

  private removeDuplicate() {
    const result = [];

    this.data.forEach((curr) => {
      let prev;
      if (curr.crn) {
        result.push(curr);
      } else {
        prev = result[result.length - 1];
        prev.classes += curr.classes;
        prev.days = prev.days.concat(curr.days);
        prev.time = prev.time.concat(curr.time);
        prev.date = prev.date.concat(curr.date);
        prev.location = prev.location.concat(curr.location);
        prev.instructor = prev.instructor.concat(curr.instructor);
        prev.attribute = prev.attribute.concat(curr.attribute);
      }
    });
    return result;
  }

  private parseDate(string) {
    if (!string) return '';
    if (string === 'TBA') return string;
    const [start, end] = string.split('-').map((date) => {
      const [month, day] = date.split('/').map((item) => +item);
      return {
        month,
        day,
      };
    });

    return {
      start,
      end,
    };
  }

  private parseDays(string) {
    if (!string) return 'TBA';
    return string;
  }

  private parseTime(string) {
    if (!string) return '';
    if (string === 'TBA' || string === 'WEB') return string;

    const [start, end] = string.split('-').map((date) => {
      const [time, period] = date.split(' ');
      let [hour, minute] = time.split(':').map((item) => +item);
      if (period === 'pm') {
        hour += 12;
      }
      return {
        hour,
        minute,
      };
    });

    return {
      start,
      end,
    };
  }
}
