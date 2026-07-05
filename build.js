/**
 * @file build.js
 * @description Auto-generates course cards in index.html and creates index.html files
 * for course folders if they don't exist, based on the Algonquin College repository structure.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = __dirname;
const MAIN_HTML = path.join(ROOT_DIR, 'index.html');
const IGNORED_DIRS = ['.git', 'node_modules', 'assets', 'css', 'js', '.vscode', 'img'];

// Define Semesters based on top-level folders
const SEMESTERS = {
    '26S_CST8326': { label: 'Summer 2026', icon: 'fa-js', id: 'sum2026' }, // Root level course
    'fall2024': { label: 'Fall 2024', icon: 'fa-html5', id: 'fall2024' },
    'win2024': { label: 'Winter 2024', icon: 'fa-laptop-code', id: 'win2024' },
    'fall2023': { label: 'Fall 2023', icon: 'fa-java', id: 'fall2023' },
    'fal2023': { label: 'Fall 2023', icon: 'fa-java', id: 'fall2023' },
    'fall2022': { label: 'Fall 2022', icon: 'fa-code', id: 'fall2022' },
    'python': { label: 'Python', icon: 'fa-python', id: 'python' },
    'CST8238-300-Thu': { label: 'Fall 2024', icon: 'fa-html5', id: 'fall2024' }, // Root level course
};

// Course mapping to find folders containing courses
function getCourseFolders() {
    const courseFolders = [];

    // Scan root directory
    const rootItems = fs.readdirSync(ROOT_DIR, { withFileTypes: true });

    rootItems.forEach(item => {
        if (!item.isDirectory() || IGNORED_DIRS.includes(item.name)) return;

        // Is it a root level course (e.g. CST8238-300-Thu, python, 26S_CST8326)?
        if (item.name === 'CST8238-300-Thu' || item.name === 'python' || item.name === '26S_CST8326') {
            courseFolders.push({
                path: item.name,
                name: item.name,
                semester: SEMESTERS[item.name] || { label: 'General', icon: 'fa-laptop-code', id: 'all' }
            });
            return;
        }

        // Is it a semester directory? (e.g., fall2022, win2024)
        if (SEMESTERS[item.name]) {
            const semesterObj = SEMESTERS[item.name];
            const semesterPath = path.join(ROOT_DIR, item.name);
            const subItems = fs.readdirSync(semesterPath, { withFileTypes: true });

            subItems.forEach(subItem => {
                if (subItem.isDirectory() && !IGNORED_DIRS.includes(subItem.name)) {
                    courseFolders.push({
                        path: `${item.name}/${subItem.name}`,
                        name: subItem.name,
                        semester: semesterObj
                    });
                }
            });

            // If the semester folder itself has files directly (like win2024) and no sub-course folders, treat it as a course
            const hasSubDirs = subItems.some(i => i.isDirectory() && !IGNORED_DIRS.includes(i.name));
            if (!hasSubDirs) {
                courseFolders.push({
                    path: item.name,
                    name: item.name,
                    semester: semesterObj
                });
            }
        }
    });

    return courseFolders;
}

// Ensure every course folder has an index.html
function generateCourseIndexPages(courseFolders) {
    courseFolders.forEach(course => {
        const fullPath = path.join(ROOT_DIR, course.path);
        const indexPath = path.join(fullPath, 'index.html');

        // Skip if a main file like masterclass.html exists & is targeted directly in index
        if (course.name === 'CST8238-300-Thu' && fs.existsSync(path.join(fullPath, 'masterclass.html'))) {
            course.targetFile = 'masterclass.html';
            return;
        }

        course.targetFile = '';

        if (!fs.existsSync(indexPath)) {
            console.log(`Generating auto-index for: ${course.path}`);

            // Read all files in this directory to list them
            const files = fs.readdirSync(fullPath).filter(f => f !== 'index.html' && f !== '.DS_Store');

            const fileListHTML = files.map(file => {
                let icon = 'fa-file';
                if (file.endsWith('.md')) icon = 'fa-markdown';
                if (file.endsWith('.html')) icon = 'fa-html5';
                if (file.endsWith('.java')) icon = 'fa-java';
                if (file.endsWith('.py')) icon = 'fa-python';
                if (file.endsWith('.pdf')) icon = 'fa-file-pdf';
                if (file.endsWith('.css') || file.endsWith('.js')) icon = 'fa-code';

                return `
                <a href="./${file}" target="_blank" class="file-card">
                    <i class="fas ${icon} file-icon"></i>
                    <span class="file-name">${file}</span>
                </a>`;
            }).join('');

            // Depth calculation for CSS path
            const depth = course.path.split('/').length;
            const upPath = '../'.repeat(depth);

            const indexContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Qasim.dev | ${course.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;600;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="${upPath}assets/css/styles.css">
    <style>
        .course-header-area { padding-top: 120px; text-align: center; margin-bottom: 60px; }
        .file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px; }
        .file-card { 
            display: flex; align-items: center; gap: 16px; padding: 20px; 
            background: var(--glass-bg); border: 1px solid var(--glass-border); 
            border-radius: var(--radius-md); transition: var(--transition-smooth);
        }
        .file-card:hover { background: var(--glass-hover); transform: translateY(-4px); border-color: var(--primary-accent); }
        .file-icon { font-size: 1.5rem; color: var(--primary-accent); }
        .file-name { font-weight: 500; word-break: break-all; }
        .back-btn { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 24px; color: var(--text-secondary); transition: var(--transition-fast); }
        .back-btn:hover { color: var(--primary-accent); }
    </style>
</head>
<body>
    <div class="bg-shape shape-1"></div>
    <div class="bg-shape shape-2"></div>
    
    <nav class="navbar scrolled">
        <div class="container nav-container">
            <a href="${upPath}index.html" class="logo">
                <span class="logo-text">Qasim<span class="highlight">.dev</span></span>
            </a>
            <ul class="nav-links">
                <li><a href="${upPath}index.html#courses">Back to Portal</a></li>
            </ul>
        </div>
    </nav>

    <div class="container course-header-area">
        <a href="${upPath}index.html#courses" class="back-btn"><i class="fas fa-arrow-left"></i> Course Explorer</a>
        <div class="badge">${course.semester.label}</div>
        <h1 class="hero-title">${course.name}</h1>
        <p class="hero-subtitle">Directory Listing & Auto-Generated Index</p>
    </div>

    <div class="container section-padding" style="padding-top: 0;">
        <div class="file-grid">
            ${fileListHTML || '<p style="color: var(--text-secondary);">No files found in this directory.</p>'}
        </div>
    </div>
</body>
</html>
`;
            fs.writeFileSync(indexPath, indexContent);
        } else {
            console.log(`Index already exists for: ${course.path}`);
        }
    });
}

// Update the main index.html with the new course cards
function updateMainIndex(courseFolders) {
    if (!fs.existsSync(MAIN_HTML)) {
        console.error("index.html not found at root!");
        return;
    }

    let mainHtmlContent = fs.readFileSync(MAIN_HTML, 'utf8');

    // Generate HTML for all cards
    const cardsHTML = courseFolders.map(course => {
        let titleParts = course.name.split('-');
        let displayTitle = titleParts[0];
        let displayDesc = course.name;

        // Beautify existing names
        if (course.name === '26S_CST8326') { displayTitle = 'CST 8326 · Web Programming'; displayDesc = 'The Web Archipelago — weekly concept guides with runnable examples.'; }
        if (course.name === 'python') { displayTitle = 'Python Bootcamp'; displayDesc = 'Python scripts and lessons.'; }
        if (displayTitle === 'CST8238') { displayTitle = 'CST 8238 Masterclass'; displayDesc = 'Web Programming Interactive Sessions.'; }
        if (displayTitle === 'fal2023') { displayTitle = 'Fall 2023 Materials'; }
        if (displayTitle === 'fall2022') { displayTitle = 'Fall 2022 Materials'; }
        if (displayTitle === 'win2024') { displayTitle = 'Winter 2024 Materials'; }

        const href = `./${course.path}/${course.targetFile ? course.targetFile : ''}`;

        return `
                <!-- Auto-Generated: ${course.path} -->
                <a href="${href}" target="_blank" class="course-card glass-panel mix ${course.semester.id}">
                    <div class="card-glow"></div>
                    <div class="course-header">
                        <span class="semester-tag">${course.semester.label}</span>
                        <i class="fab ${course.semester.icon} course-icon"></i>
                    </div>
                    <h3 class="course-title">${displayTitle}</h3>
                    <p class="course-desc">${displayDesc}</p>
                    <div class="course-footer">
                        <span class="view-link">View Materials <i class="fas fa-arrow-right"></i></span>
                    </div>
                </a>`;
    }).join('\n');

    // Regex to find and replace the courses grid
    const startTag = '<!-- Courses Grid -->\n            <div class="courses-grid" id="courses-grid">';
    const endTag = '</div>\n        </div>\n    </section>';

    const startIndex = mainHtmlContent.indexOf(startTag);
    const endIndex = mainHtmlContent.indexOf(endTag, startIndex);

    if (startIndex !== -1 && endIndex !== -1) {
        const insertPos = startIndex + startTag.length;
        const newHtml = mainHtmlContent.substring(0, insertPos) + '\n' + cardsHTML + '\n            ' + mainHtmlContent.substring(endIndex);
        fs.writeFileSync(MAIN_HTML, newHtml);
        console.log("Successfully injected courses into index.html!");
    } else {
        console.error("Could not find the injection points in index.html");
    }
}

// Execution
console.log("Starting Build Script...");
const folders = getCourseFolders();
console.log(`Found ${folders.length} course folders.`);
generateCourseIndexPages(folders);
updateMainIndex(folders);
console.log("Build Script Completed Successfully!");
