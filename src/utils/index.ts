import fs from 'fs';
import util from 'util';
import http from 'http';
import rimraf from 'rimraf';

import request from 'request';
export const writeFile = util.promisify(fs.writeFile);
export const readFile = util.promisify(fs.readFile);
export const rmDir = util.promisify(rimraf);

export const download = function(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const sendReq = request.get(url);

    // check for request errors
    sendReq.on('error', function(err) {
      fs.unlinkSync(dest);
    });
    sendReq.on('response', function(response) {
      if (response.statusCode !== 200) {
        fs.unlinkSync(dest);
        reject(url);
      }
    });

    sendReq.pipe(file);

    file.on('finish', function() {
      file.close();
      resolve();
    });
  });
};

export function getAllIndexes<T>(arr: T[], val: T): number[] {
  const indexes: number[] = [];

  let i = -1;
  while ((i = arr.indexOf(val, i + 1)) != -1) {
    indexes.push(i);
  }
  return indexes;
}
