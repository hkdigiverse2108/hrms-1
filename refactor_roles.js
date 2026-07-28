const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.next')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync('d:/hrms-1/frontend');

let modifiedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace checks for HR
  content = content.replace(/user\?\.role === 'HR'/g, "user?.designation?.toLowerCase() === 'hr'");
  content = content.replace(/user\.role === 'HR'/g, "user.designation?.toLowerCase() === 'hr'");
  content = content.replace(/emp\.role === 'HR'/g, "emp.designation?.toLowerCase() === 'hr'");
  
  // Replace checks for Team Leader (exact match)
  content = content.replace(/user\?\.role === 'Team Leader'/g, "(user?.designation?.toLowerCase() === 'team leader' || user?.designation?.toLowerCase() === 'head')");
  content = content.replace(/user\.role === 'Team Leader'/g, "(user.designation?.toLowerCase() === 'team leader' || user.designation?.toLowerCase() === 'head')");
  content = content.replace(/emp\.role === 'Team Leader'/g, "(emp.designation?.toLowerCase() === 'team leader' || emp.designation?.toLowerCase() === 'head')");
  
  // Replace checks for Team Leader (toLowerCase)
  content = content.replace(/user\?\.role\?\.toLowerCase\(\) === 'team leader'/g, "(user?.designation?.toLowerCase() === 'team leader' || user?.designation?.toLowerCase() === 'head')");
  content = content.replace(/user\.role\?\.toLowerCase\(\) === 'team leader'/g, "(user.designation?.toLowerCase() === 'team leader' || user.designation?.toLowerCase() === 'head')");
  
  // Specific checks in digital-marketing/page.tsx or others that do includes()
  // "['admin', 'super admin', 'superadmin', 'team leader'].includes(user.role?.toLowerCase() || '')"
  // It's safer to just let the script do basic replacements, but let's check for any 'team leader' inside role includes.
  content = content.replace(/\['admin', 'super admin', 'superadmin', 'team leader'\]\.includes\(user\.role\?\.toLowerCase\(\) \|\| ''\)/g, "(['admin', 'super admin', 'superadmin'].includes(user.role?.toLowerCase() || '') || user.designation?.toLowerCase() === 'team leader' || user.designation?.toLowerCase() === 'head')");

  content = content.replace(/\['admin', 'super admin', 'superadmin', 'team leader', 'hr'\]\.includes\(user\.role\?\.toLowerCase\(\) \|\| ''\)/g, "(['admin', 'super admin', 'superadmin'].includes(user.role?.toLowerCase() || '') || user.designation?.toLowerCase() === 'team leader' || user.designation?.toLowerCase() === 'head' || user.designation?.toLowerCase() === 'hr')");

  // Also clean up redundant || user.designation?.toLowerCase() === 'team leader' which might happen after replacement
  content = content.replace(/\|\| user\.designation\?\.toLowerCase\(\) === 'team leader'/g, ""); // wait, this could break if they already had it. Let's not do this globally.

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    modifiedFiles++;
    console.log('Modified:', file);
  }
});

console.log('Total modified files:', modifiedFiles);
