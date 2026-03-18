import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'data', 'coursesFile.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let updated = false;
for (const course of data.courses) {
  if (course.code === 'CSC1300') {
    course.corequisites = ['MATH1910'];
    updated = true;
  }
  if (course.code === 'MATH1910') {
    course.placementRequirements = [
      {
        type: 'ACT',
        subject: 'Math',
        minimumScore: 26,
        description: 'ACT Math score of 26 or higher, or completion of MATH1730'
      }
    ];
    updated = true;
  }
}

if (updated) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
  console.log('Successfully updated coursesFile.json');
} else {
  console.log('Courses not found :(');
}
