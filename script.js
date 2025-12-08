
        const DEBOUNCE_DELAY = 500;

        // Global Variables
        let userData = {
            selectedTemplate: 'b1',
            name: '', title: '', email: '', phone: '', linkedin: '', location: '', summary: '',
            experiences: [], 
            educations: [],
            projects: [], // Structured projects
            skills: '', 
        };

        // Initial State
        if (userData.experiences.length === 0) {
            userData.experiences.push({ jobTitle: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' });
        }
        if (userData.educations.length === 0) {
            userData.educations.push({ degree: '', institution: '', location: '', gradDate: '', gpa: '' });
        }
        if (userData.projects.length === 0) {
            userData.projects.push({ name: '', description: '', technologies: '', link: '' });
        }

        const TEMPLATE_METADATA = {
            'b1': { name: 'Standard Green', category: 'b' },
            'b2': { name: 'Clean Structure', category: 'b' },
            'b3': { name: 'Minimalist', category: 'b' },
            'i1': { name: 'Modern Professional', category: 'i' }, 
            'i2': { name: 'Executive Balance', category: 'i' },   
            'i3': { name: 'Tech Focus', category: 'i' },          
            'p1': { name: 'Corporate Elite', category: 'p' },
            'p2': { name: 'Leadership', category: 'p' },
            'p3': { name: 'Distinguished', category: 'p' },
            'p4': { name: 'Modern Strategic', category: 'p' }, 
        };

        let saveTimeout;
        let firebaseDb, firebaseAppId, firebaseUserId, firestoreDoc, firestoreSetDoc, firestoreOnSnapshot;

        // --- Global Functions Attached to Window ---

        window.startAppLogic = function(db, appId, userId, doc, setDoc, onSnapshot) {
            firebaseDb = db;
            firebaseAppId = appId;
            firebaseUserId = userId;
            firestoreDoc = doc;
            firestoreSetDoc = setDoc;
            firestoreOnSnapshot = onSnapshot;

            if (db && userId) {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/resumes/current_data`);
                firestoreOnSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        userData = { ...userData, ...data };
                        // Ensure arrays exist
                        if (!userData.experiences || userData.experiences.length === 0) userData.experiences = [{ jobTitle: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' }];
                        if (!userData.educations || userData.educations.length === 0) userData.educations = [{ degree: '', institution: '', location: '', gradDate: '', gpa: '' }];
                        if (!userData.projects || userData.projects.length === 0) userData.projects = [{ name: '', description: '', technologies: '', link: '' }];
                        
                        updateFormInputs();
                        document.getElementById('save-status-text').textContent = 'Saved';
                    }
                    renderPreview();
                    updateTabAndCardVisibility(TEMPLATE_METADATA[userData.selectedTemplate]?.category || 'b');
                });
            } else {
                updateFormInputs();
                renderPreview();
                updateTabAndCardVisibility('b');
            }
            
            initializeListeners();
        };

        window.showLandingPage = () => switchScreen('landing-page');
        
        window.showTemplateSelection = (category = 'b') => {
            switchScreen('template-selection-page');
            updateTabAndCardVisibility(category);
        };
        
        window.startBuilder = (templateKey) => {
            switchScreen('main-app-container');
            userData.selectedTemplate = templateKey;
            document.getElementById('current-template-name').textContent = TEMPLATE_METADATA[templateKey].name;
            renderPreview();
            triggerSave();
        };

        window.saveUserData = () => triggerSave();

       // index.html में, downloadPdf फ़ंक्शन को इससे बदलें:
// ===== PDF DOWNLOAD (FINAL) =====
window.downloadPdf = async function () {
  const { jsPDF } = window.jspdf;

  const wrapper = document.getElementById('resume-preview-wrapper');
  const scaleWrapper = document.getElementById("resume-scale-wrapper");

  // STORE OLD STYLES
  const old = {
    wrapperTransform: wrapper.style.transform,
    scaleTransform: scaleWrapper.style.transform,
    width: scaleWrapper.style.width,
    minHeight: scaleWrapper.style.minHeight,
    lineHeight: document.getElementById("resume-content").style.lineHeight,
    letterSpacing: document.getElementById("resume-content").style.letterSpacing,
  };

  // FIX FOR PDF - MATCH LIVE LAYOUT
  applyPdfStyles();

  // WAIT 1 FRAME TO APPLY CSS
  await new Promise(resolve => requestAnimationFrame(resolve));

  const canvas = await html2canvas(scaleWrapper, {
    scale: 2,          // HIGH DPI = Crisp PDF
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4", true);

  const pdfWidth = 210;
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= 297;

  while (heightLeft > 0) {
    position -= 297;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 297;
  }

  pdf.save("Resume.pdf");

  // RESTORE PREVIEW LAYOUT
  restoreStyles(old);
};





        // --- UI Helper Functions ---

        function switchScreen(id) {
            ['landing-page', 'template-selection-page', 'main-app-container'].forEach(s => document.getElementById(s).classList.add('hidden'));
            document.getElementById(id).classList.remove('hidden');
        }

        function updateTabAndCardVisibility(category) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                const isSelected = btn.dataset.category === category;
                btn.classList.toggle('bg-green-600', isSelected && category === 'b');
                btn.classList.toggle('bg-blue-600', isSelected && category === 'i');
                btn.classList.toggle('bg-purple-600', isSelected && category === 'p');
                btn.classList.toggle('text-white', isSelected);
                btn.classList.toggle('text-gray-700', !isSelected);
            });
            
            const container = document.getElementById('template-cards-container');
            container.innerHTML = '';
            const filtered = Object.keys(TEMPLATE_METADATA).filter(key => TEMPLATE_METADATA[key].category === category);
            const color = category === 'b' ? 'green' : (category === 'i' ? 'blue' : 'purple');

            filtered.forEach(key => {
                const meta = TEMPLATE_METADATA[key];
                // Note: The template card styling is updated to use dynamic color variables 
                // to avoid issues with Tailwind's purging of dynamic classes.
                const colorHex = category === 'b' ? '#059669' : (category === 'i' ? '#3b82f6' : '#9333ea');
                const hoverColorHex = category === 'b' ? '#047857' : (category === 'i' ? '#2563eb' : '#7e22ce');
                
                container.innerHTML += `
                    <div class="template-card">
                        <div class="template-preview flex justify-center items-start"> <div class="mini-resume-style-container" id="mini-container-${key}">
                                <div class="mini-resume-style" id="mini-${key}"></div>
                            </div>
                        </div>
                        <div class="p-5 text-center">
                            <h3 class="text-xl font-bold mb-1">${meta.name}</h3>
                            <button onclick="startBuilder('${key}')" style="background-color: ${colorHex};" class="w-full py-2 mt-4 text-white font-semibold rounded-lg transition" onmouseover="this.style.backgroundColor='${hoverColorHex}'" onmouseout="this.style.backgroundColor='${colorHex}'">Use This Template</button>
                        </div>
                    </div>`;
            });
            
            // Render Mini Previews
            setTimeout(() => {
               // Use more realistic data to force sections to render in the mini-preview
               const miniData = { 
                   name: 'YOUR NAME', 
                   title: 'Professional Title', 
                   email: 'email@example.com', 
                   phone: '123-456-7890', 
                   location: 'City, Country',
                   summary: 'Your professional summary will appear here. This section is concise and achievement-focused.', 
                   experiences: [
                       { jobTitle: 'Job Title', company: 'COMPANY', location: 'City, State', startDate: '2020', endDate: 'Present', description: 'Built and maintained APIs.\nManaged team of 5.' },
                       { jobTitle: 'Job Title 2', company: 'COMPANY 2', location: 'City, State', startDate: '2018', endDate: '2020', description: 'Reduced costs by 15%.\nImproved efficiency.' }
                   ],
                   educations: [
                       { degree: 'B.S. Degree', institution: 'University', location: 'City', gradDate: '2022', gpa: '4.0' },
                       { degree: 'M.S. Degree', institution: 'Second University', location: 'City', gradDate: '2024', gpa: '3.8' }
                   ],
                   skills: 'Skill 1, Skill 2, Skill 3, Skill 4, Skill 5',
                   projects: [{ name: 'Project Name', description: 'Project description goes here.', technologies: 'Tech Stack', link: 'Link' }]
               };
               
               Object.keys(TEMPLATES).forEach(key => {
                   const contentEl = document.getElementById(`mini-${key}`);
                   const containerEl = document.getElementById(`mini-container-${key}`);
                   const previewContainer = containerEl ? containerEl.closest('.template-preview') : null;
                   const templateCard = containerEl ? containerEl.closest('.template-card') : null;

                   if (contentEl && containerEl && previewContainer && templateCard) {
                       contentEl.innerHTML = TEMPLATES[key](miniData);
                       
                       // Dimensions (fixed in CSS): A4 is 794px wide.
                       const a4WidthPx = 794; 
                       
                       // We use the width of the template card's client area as the maximum width available.
                       // Use innerWidth for a safer calculation that accounts for card padding/margin
                       const cardClientWidth = templateCard.clientWidth;

                       // Calculate scale based on available width, using 95% for a slight margin
                       const finalScale = (cardClientWidth * 0.95) / a4WidthPx; /* Adjusted to 95% for better fit */

                       // Apply the scale to fit it horizontally within the preview card
                       containerEl.style.transform = `scale(${finalScale})`;
                       containerEl.style.transformOrigin = `top center`;
                       
                       // Center the scaled content horizontally within the preview box
                       previewContainer.classList.remove('justify-start');
                       previewContainer.classList.add('justify-center');
                   }
               });
            }, 0);
        }

        function updateFormInputs() {
            // Simple fields
            ['name', 'title', 'email', 'phone', 'location', 'linkedin', 'summary', 'skills'].forEach(key => {
                const el = document.getElementById(key);
                if (el) el.value = userData[key] || '';
            });
            // Complex fields
            renderExperienceForms();
            renderEducationForms();
            renderProjectForms();
        }

        // --- Dynamic Forms Logic ---

        // 1. Experience
        window.renderExperienceForms = function() {
            const container = document.getElementById('experience-list');
            container.innerHTML = '';
            userData.experiences.forEach((exp, index) => {
                const div = document.createElement('div');
                div.className = 'item-card';
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="font-semibold text-gray-700">Experience #${index + 1}</h4>
                        ${userData.experiences.length > 1 ? `<button onclick="removeExperience(${index})" class="text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>` : ''}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div><label class="input-label">Job Title *</label><input type="text" class="form-input" value="${exp.jobTitle || ''}" oninput="updateExperience(${index}, 'jobTitle', this.value)" placeholder="e.g. Senior Developer"></div>
                        <div><label class="input-label">Company *</label><input type="text" class="form-input" value="${exp.company || ''}" oninput="updateExperience(${index}, 'company', this.value)" placeholder="e.g. Tech Corp"></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div><label class="input-label">Location</label><input type="text" class="form-input" value="${exp.location || ''}" oninput="updateExperience(${index}, 'location', this.value)" placeholder="e.g. San Francisco, CA"></div>
                        <div><label class="input-label">Start Date</label><input type="text" class="form-input" value="${exp.startDate || ''}" oninput="updateExperience(${index}, 'startDate', this.value)" placeholder="e.g. Jan 2020"></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div><label class="input-label">End Date</label><input type="text" class="form-input" value="${exp.endDate || ''}" oninput="updateExperience(${index}, 'endDate', this.value)" placeholder="e.g. Present" ${exp.current ? 'disabled' : ''}></div>
                        <div class="flex items-center h-full pt-6 sm:pt-0"><label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600" ${exp.current ? 'checked' : ''} onchange="updateExperience(${index}, 'current', this.checked)"><span class="text-sm text-gray-700 font-medium">Current Position</span></label></div>
                    </div>
                    <div><label class="input-label">Description</label><textarea rows="4" class="form-input" oninput="updateExperience(${index}, 'description', this.value)" placeholder="• Achievements...">${exp.description || ''}</textarea></div>
                `;
                container.appendChild(div);
            });
        };

        window.addExperience = function() {
            userData.experiences.push({ jobTitle: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' });
            renderExperienceForms();
            renderPreview();
            triggerSave();
        };
        window.removeExperience = function(index) {
            userData.experiences.splice(index, 1);
            renderExperienceForms();
            renderPreview();
            triggerSave();
        };
        window.updateExperience = function(index, field, value) {
            userData.experiences[index][field] = value;
            if (field === 'current' && value === true) userData.experiences[index].endDate = 'Present';
            if (field === 'current') renderExperienceForms();
            renderPreview();
            triggerSave();
        };

        // 2. Education
        window.renderEducationForms = function() {
            const container = document.getElementById('education-list');
            container.innerHTML = '';
            userData.educations.forEach((edu, index) => {
                const div = document.createElement('div');
                div.className = 'item-card';
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="font-semibold text-gray-700">Education #${index + 1}</h4>
                        ${userData.educations.length > 1 ? `<button onclick="removeEducation(${index})" class="text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>` : ''}
                    </div>
                    <div class="mb-4">
                        <label class="input-label">Degree *</label>
                        <input type="text" class="form-input" value="${edu.degree || ''}" oninput="updateEducation(${index}, 'degree', this.value)" placeholder="e.g. Bachelor of Science in CS">
                    </div>
                    <div class="mb-4">
                        <label class="input-label">Institution *</label>
                        <input type="text" class="form-input" value="${edu.institution || ''}" oninput="updateEducation(${index}, 'institution', this.value)" placeholder="e.g. University of California">
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label class="input-label">Location</label><input type="text" class="form-input" value="${edu.location || ''}" oninput="updateEducation(${index}, 'location', this.value)" placeholder="e.g. Berkeley, CA"></div>
                        <div><label class="input-label">Graduation Date</label><input type="text" class="form-input" value="${edu.gradDate || ''}" oninput="updateEducation(${index}, 'gradDate', this.value)" placeholder="e.g. May 2020"></div>
                    </div>
                    <div class="mt-4">
                        <label class="input-label">GPA (Optional)</label>
                        <input type="text" class="form-input" value="${edu.gpa || ''}" oninput="updateEducation(${index}, 'gpa', this.value)" placeholder="e.g. 3.8/4.0">
                    </div>
                `;
                container.appendChild(div);
            });
        };

        window.addEducation = function() {
            userData.educations.push({ degree: '', institution: '', location: '', gradDate: '', gpa: '' });
            renderEducationForms();
            renderPreview();
            triggerSave();
        };
        window.removeEducation = function(index) {
            userData.educations.splice(index, 1);
            renderEducationForms();
            renderPreview();
            triggerSave();
        };
        window.updateEducation = function(index, field, value) {
            userData.educations[index][field] = value;
            renderPreview();
            triggerSave();
        };

        // 3. Projects
        window.renderProjectForms = function() {
            const container = document.getElementById('project-list');
            container.innerHTML = '';
            userData.projects.forEach((proj, index) => {
                const div = document.createElement('div');
                div.className = 'item-card';
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="font-semibold text-gray-700">Project #${index + 1}</h4>
                        ${userData.projects.length > 1 ? `<button onclick="removeProject(${index})" class="text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>` : ''}
                    </div>
                    <div class="mb-4">
                        <label class="input-label">Project Name *</label>
                        <input type="text" class="form-input" value="${proj.name || ''}" oninput="updateProject(${index}, 'name', this.value)" placeholder="e.g. E-Commerce Platform">
                    </div>
                    <div class="mb-4">
                        <label class="input-label">Description</label>
                        <textarea rows="3" class="form-input" oninput="updateProject(${index}, 'description', this.value)" placeholder="Built a full-stack e-commerce platform with payment integration">${proj.description || ''}</textarea>
                    </div>
                    <div class="mb-4">
                        <label class="input-label">Technologies</label>
                        <input type="text" class="form-input" value="${proj.technologies || ''}" oninput="updateProject(${index}, 'technologies', this.value)" placeholder="e.g. React, Node.js, MongoDB">
                    </div>
                    <div>
                        <label class="input-label">Link (Optional)</label>
                        <input type="text" class="form-input" value="${proj.link || ''}" oninput="updateProject(${index}, 'link', this.value)" placeholder="e.g. github.com/user/project">
                    </div>
                `;
                container.appendChild(div);
            });
        };

        window.addProject = function() {
            userData.projects.push({ name: '', description: '', technologies: '', link: '' });
            renderProjectForms();
            renderPreview();
            triggerSave();
        };
        window.removeProject = function(index) {
            userData.projects.splice(index, 1);
            renderProjectForms();
            renderPreview();
            triggerSave();
        };
        window.updateProject = function(index, field, value) {
            userData.projects[index][field] = value;
            renderPreview();
            triggerSave();
        };

        function initializeListeners() {
            // Re-run autoFitContent on window resize (debounced)
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (document.getElementById('main-app-container').classList.contains('hidden') === false) {
                        autoFitContent();
                    }
                    if (document.getElementById('template-selection-page').classList.contains('hidden') === false) {
                        // Re-render templates to adjust the scale of mini-previews
                        updateTabAndCardVisibility(document.querySelector('.tab-btn.text-white').dataset.category);
                    }
                }, 100);
            });

            const tabs = document.querySelectorAll('.tab-btn');
            if(tabs) tabs.forEach(btn => btn.addEventListener('click', (e) => updateTabAndCardVisibility(e.target.dataset.category)));
            
            const formContainer = document.getElementById('main-form-column');
            if (formContainer) {
                formContainer.addEventListener('input', (e) => {
                    // Check if the input is one of the simple fields
                    const isSimpleField = ['name', 'title', 'email', 'phone', 'location', 'linkedin', 'summary', 'skills'].includes(e.target.id);

                    // If it's a simple field, update and re-render
                    if (isSimpleField && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                        userData[e.target.id] = e.target.value;
                        renderPreview();
                        triggerSave();
                    }
                    // Complex fields (Experience, Education, Projects) are handled by their update functions
                });
            }
        }

        function triggerSave() {
            if (!firebaseDb || !firebaseUserId) return;
            clearTimeout(saveTimeout);
            document.getElementById('save-status-text').textContent = 'Saving...';
            saveTimeout = setTimeout(async () => {
                try {
                    await firestoreSetDoc(firestoreDoc(firebaseDb, `artifacts/${firebaseAppId}/users/${firebaseUserId}/resumes/current_data`), userData, { merge: true });
                    document.getElementById('save-status-text').textContent = 'Saved';
                } catch (e) { console.error(e); }
            }, DEBOUNCE_DELAY);
        }

        function renderPreview() {
            const content = document.getElementById('resume-content');
            const tmpl = TEMPLATES[userData.selectedTemplate];
            if (content && tmpl) {
                content.innerHTML = tmpl(userData);
                setTimeout(autoFitContent, 0);
            }
        }

        // --- Auto-Fit Engine (Responsive Update - FIXED) ---
        function autoFitContent() {
            const wrapper = document.getElementById('resume-preview-wrapper');
            const scaleWrapper = document.getElementById('resume-scale-wrapper');
            
            if (!wrapper || !scaleWrapper) return;

            // 1. Reset scaling and height of A4 container to its natural size
            scaleWrapper.style.transform = 'scale(1)';
            scaleWrapper.style.width = '210mm'; // Re-establish A4 width for calculation
            scaleWrapper.style.height = '297mm'; // Re-establish A4 height for calculation
            
            // On desktop, the wrapper has a hardcoded scale(0.9) in CSS via media queries, 
            // which we keep for the zoomed-out desktop view.
            const isDesktop = window.innerWidth >= 1024;
            
            if (isDesktop) {
                // For desktop: Only adjust if the resume height exceeds 297mm.
                // The parent container (#preview-column .flex-1) is scrollable.
                // We ensure the wrapper keeps its base scale (0.9) from CSS, 
                // but let its height expand based on content.
                
                // Let the wrapper take its scaled size and let the outer scroll handle long content.
                wrapper.style.removeProperty('height'); 
                wrapper.style.minHeight = '297mm'; // Maintain min-height to prevent jumping
                wrapper.style.transform = 'scale(0.9)'; // Re-apply desktop scale from CSS
                wrapper.style.transformOrigin = 'top center';
            } else {
                // For mobile/tablet: Scale to fit the available width (100% of the parent container).
                const maxPreviewWidth = wrapper.parentElement.clientWidth;
                
                // We need the unscaled width of the A4 container inside the wrapper (which is defined as 210mm, approx 794px in your CSS).
                // Let's rely on wrapper.clientWidth when it's not scaled.
                const a4WidthPx = wrapper.clientWidth; 
                
                // Calculate scale factor (use 95% of max width for a slight margin)
                const finalScale = (maxPreviewWidth * 0.95) / a4WidthPx; 

                // Apply the scale to the A4 content
                wrapper.style.transform = `scale(${finalScale})`;
                wrapper.style.transformOrigin = `top center`;

                // Calculate the final scaled height and apply it to the wrapper's parent 
                // to correctly size the background box and avoid excess vertical space.
                const scaledHeight = scaleWrapper.clientHeight * finalScale;
                wrapper.style.height = `${scaledHeight}px`;
                wrapper.style.minHeight = 'auto'; // Remove min-height constraint for perfect fit on mobile/tablet
            }
            
            // Set scaleWrapper dimensions inversely to the scale to occupy space (only applies to PDF generation, so let's reset it here)
            scaleWrapper.style.width = '100%';
            scaleWrapper.style.height = '100%';
        }


        // --- Parsing Helpers ---

        function renderExperiences(experiences) {
            const validExperiences = experiences.filter(exp => exp.jobTitle && exp.jobTitle.trim() && exp.company && exp.company.trim());
            if (validExperiences.length === 0) return '';

            return validExperiences.map(exp => {
                const bullets = exp.description ? exp.description.split('\n').map(line => line.replace(/^•\s*/, '')).filter(l => l.trim()) : [];
                return `
                <div class="mb-3">
                    <div class="flex justify-between items-baseline">
                        <h4 class="font-bold text-inherit text-sm">${exp.jobTitle}</h4>
                        <span class="text-xs opacity-70 whitespace-nowrap">${exp.startDate} - ${exp.endDate}</span>
                    </div>
                    <div class="flex justify-between items-center mb-1">
                        <p class="text-xs font-semibold opacity-90 uppercase tracking-wide">${exp.company}</p>
                        <p class="text-xs opacity-70 italic">${exp.location}</p>
                    </div>
                    ${bullets.length > 0 ? `<ul class="list-disc ml-4 text-xs opacity-80 space-y-1">
                        ${bullets.map(b => `<li>${b}</li>`).join('')}
                    </ul>` : ''}
                </div>`;
            }).join('');
        }

        function renderEducations(educations, isSimple = false) {
            const validEducations = educations.filter(edu => edu.degree && edu.degree.trim() && edu.institution && edu.institution.trim());
            if (validEducations.length === 0) return '';
            
            return validEducations.map(edu => {
                if (isSimple) {
                    return `
                    <div class="mb-3">
                        <p class="font-bold text-xs">${edu.degree}</p>
                        <p class="text-xs opacity-80">${edu.institution}</p>
                        <div class="flex justify-between text-xs opacity-60 italic">
                             <span>${edu.location}</span>
                             <span>${edu.gradDate}</span>
                        </div>
                        ${edu.gpa ? `<p class="text-xs opacity-70">GPA: ${edu.gpa}</p>` : ''}
                    </div>`;
                } else {
                    return `
                    <div class="mb-2">
                        <div class="flex justify-between">
                            <p class="font-bold text-sm">${edu.degree}</p>
                            <span class="text-xs opacity-70">${edu.gradDate}</span>
                        </div>
                        <p class="text-xs font-medium">${edu.institution}</p>
                        ${edu.gpa ? `<p class="text-xs opacity-70">GPA: ${edu.gpa}</p>` : ''}
                    </div>`;
                }
            }).join('');
        }

        function renderProjects(projects) {
            const validProjects = projects.filter(proj => proj.name && proj.name.trim());
            if (validProjects.length === 0) return '';
            
            return validProjects.map(proj => `
                <div class="mb-3">
                    <div class="flex justify-between items-baseline">
                        <h4 class="font-bold text-sm text-inherit">${proj.name}</h4>
                        ${proj.link ? `<span class="text-xs opacity-70">${proj.link}</span>` : ''}
                    </div>
                    ${proj.description ? `<p class="text-xs opacity-90 mb-1">${proj.description}</p>` : ''}
                    ${proj.technologies ? `<p class="text-[10px] opacity-70 italic">Tech: ${proj.technologies}</p>` : ''}
                </div>
            `).join('');
        }
        
        function renderSkills(skills) {
             const trimmedSkills = skills.trim();
             if (!trimmedSkills) return '';
             return `<p class="text-xs text-gray-700">${trimmedSkills}</p>`;
        }
        
        function renderSummary(summary) {
            const trimmedSummary = summary.trim();
            if (!trimmedSummary) return '';
            return `<p class="text-sm text-gray-700">${trimmedSummary}</p>`;
        }

        // --- Templates ---
        const TEMPLATES = {
            // FIX: Conditional rendering and reduced outer spacing implemented for B1
            'b1': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);
                
                return `<div class="a4-padding-compact h-full font-lato flex flex-col justify-start space-y-3">
                    <div class="text-center border-b-2 border-green-500 pb-2 mb-1 flex-shrink-0">
                        <h1 class="text-3xl font-bold text-gray-900">${d.name}</h1>
                        <p class="text-lg text-green-700 font-medium mt-1">${d.title}</p>
                        <p class="text-xs text-gray-500 mt-2">${[d.email, d.phone, d.location].filter(x=>x).join(' | ')}</p>
                    </div>
                    <div class="flex-grow flex flex-col space-y-3">
                        ${summaryHtml ? `<div><h3 class="text-sm font-bold text-green-600 uppercase tracking-wider border-b border-gray-200 pb-1 mb-2">Summary</h3>${summaryHtml}</div>` : ''}
                        ${experiencesHtml ? `<div><h3 class="text-sm font-bold text-green-600 uppercase tracking-wider border-b border-gray-200 pb-1 mb-2">Experience</h3>${experiencesHtml}</div>` : ''}
                        ${educationsHtml ? `<div><h3 class="text-sm font-bold text-green-600 uppercase tracking-wider border-b border-gray-200 pb-1 mb-2">Education</h3>${educationsHtml}</div>` : ''}
                        ${projectsHtml ? `<div><h3 class="text-sm font-bold text-green-600 uppercase tracking-wider border-b border-gray-200 pb-1 mb-2">Projects</h3>${projectsHtml}</div>` : ''}
                        ${skillsHtml ? `<div><h3 class="text-sm font-bold text-green-600 uppercase tracking-wider border-b border-gray-200 pb-1 mb-2">Skills</h3>${skillsHtml}</div>` : ''}
                    </div>
                </div>`;
            },
            
            // FIX: Conditional rendering and reduced outer spacing implemented for B2
            'b2': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);
                
                return `<div class="a4-padding-compact h-full font-serif flex flex-col justify-start space-y-3">
                    <div class="mb-4 border-b border-blue-200 pb-2 flex-shrink-0">
                        <h1 class="text-4xl font-bold text-gray-900">${d.name}</h1>
                        <p class="text-lg text-blue-600 font-medium">${d.title}</p>
                        <div class="text-xs text-gray-500">${[d.email, d.phone, d.location].filter(x=>x).join(' | ')}</div>
                    </div>
                    <div class="flex-grow flex flex-col space-y-3">
                        ${summaryHtml ? `<div><h3 class="text-sm font-bold text-blue-800 uppercase mb-2">About</h3>${summaryHtml}</div>` : ''}
                        ${experiencesHtml ? `<div><h3 class="text-sm font-bold text-blue-800 uppercase mb-2">Experience</h3>${experiencesHtml}</div>` : ''}
                        ${educationsHtml ? `<div><h3 class="text-sm font-bold text-blue-800 uppercase mb-2">Education</h3>${educationsHtml}</div>` : ''}
                        ${projectsHtml ? `<div><h3 class="text-sm font-bold text-blue-800 uppercase mb-2">Projects</h3>${projectsHtml}</div>` : ''}
                        ${skillsHtml ? `<div><h3 class="text-sm font-bold text-blue-800 uppercase mb-2">Skills</h3>${skillsHtml}</div>` : ''}
                    </div>
                </div>`;
            },
            
            'b3': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);

                return `<div class="a4-padding-compact h-full font-montserrat text-gray-800 flex flex-col justify-start space-y-3 text-center">
                    <div class="mb-4 flex-shrink-0">
                        <h1 class="text-4xl font-extrabold uppercase tracking-[0.2em] text-black">${d.name}</h1>
                        <p class="text-xs uppercase tracking-[0.15em] text-gray-500">${d.title}</p>
                        <div class="text-[10px] text-gray-400 border-t border-b border-gray-100 py-2 mt-2">${[d.email, d.phone, d.location].filter(x=>x).join(' • ')}</div>
                    </div>
                    <div class="flex-grow flex flex-col space-y-3 text-left">
                        ${summaryHtml ? `<div><h3 class="text-[10px] font-bold text-black uppercase tracking-[0.15em] mb-2 text-center">Summary</h3><p class="text-xs text-gray-600 text-center">${d.summary}</p></div>` : ''}
                        ${experiencesHtml ? `<div><h3 class="text-[10px] font-bold text-black uppercase tracking-[0.15em] mb-2 text-center">Experience</h3>${experiencesHtml}</div>` : ''}
                        ${educationsHtml ? `<div class="text-center"><h3 class="text-[10px] font-bold text-black uppercase tracking-[0.15em] mb-2">Education</h3>${educationsHtml}</div>` : ''}
                        ${projectsHtml ? `<div class="text-center"><h3 class="text-[10px] font-bold text-black uppercase tracking-[0.15em] mb-2">Projects</h3>${projectsHtml}</div>` : ''}
                        ${skillsHtml ? `<div><h3 class="text-[10px] font-bold text-black uppercase tracking-[0.15em] mb-2">Skills</h3>${skillsHtml}</div>` : ''}
                    </div>
                </div>`;
            },

            'i1': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations, true);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);

                return `<div class="flex h-full bg-white font-sans flex-col sm:flex-row">
                    <div class="w-full sm:w-1/3 bg-slate-800 text-white p-6 sm:p-8 flex flex-col gap-6 sm:gap-8 flex-shrink-0">
                        ${[d.email, d.phone, d.location].filter(x=>x).length > 0 ? `<div><h3 class="text-xs font-bold border-b border-slate-600 pb-1 mb-4 text-gray-400">CONTACT</h3><p class="text-xs mb-6">${[d.email, d.phone, d.location].filter(x=>x).join('<br>')}</p></div>` : ''}
                        ${skillsHtml ? `<div><h3 class="text-xs font-bold border-b border-slate-600 pb-1 mb-4 text-gray-400">SKILLS</h3><p class="text-xs text-gray-300 mb-6">${d.skills}</p></div>` : ''}
                        ${educationsHtml ? `<div><h3 class="text-xs font-bold border-b border-slate-600 pb-1 mb-4 text-gray-400">EDUCATION</h3>${educationsHtml}</div>` : ''}
                    </div>
                    <div class="w-full sm:w-2/3 p-6 sm:p-10 flex flex-col gap-6 sm:gap-8 flex-grow">
                        <div class="flex-shrink-0">
                            <h1 class="text-3xl sm:text-5xl font-bold text-slate-800">${d.name}</h1>
                            <p class="text-lg sm:text-xl text-blue-600 font-medium mb-6 sm:mb-8">${d.title}</p>
                            ${summaryHtml ? `<div><h3 class="text-sm font-bold text-slate-700 uppercase border-b-2 border-blue-100 pb-1 mb-3">Summary</h3><p class="text-sm text-gray-600">${d.summary}</p></div>` : ''}
                        </div>
                        ${experiencesHtml ? `<div class="mt-0 sm:mt-6 flex-shrink-0"><h3 class="text-sm font-bold text-slate-700 uppercase border-b-2 border-blue-100 pb-1 mb-4">Experience</h3>${experiencesHtml}</div>` : ''}
                        ${projectsHtml ? `<div class="mt-0 sm:mt-auto"><h3 class="text-sm font-bold text-slate-700 uppercase border-b-2 border-blue-100 pb-1 mb-3">Projects</h3>${projectsHtml}</div>` : ''}
                    </div>
                </div>`;
            },
            
            'i2': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations, true);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);

                return `<div class="flex flex-col h-full bg-white font-sans">
                    <div class="bg-blue-600 text-white p-6 sm:p-10 flex-shrink-0">
                        <h1 class="text-4xl sm:text-5xl font-bold">${d.name}</h1>
                        <p class="text-lg sm:text-xl opacity-90">${d.title}</p>
                    </div>
                    <div class="flex-grow p-6 sm:p-10 flex flex-col sm:flex-row gap-6 sm:gap-10">
                        <div class="w-full sm:w-7/12 flex flex-col gap-6 sm:gap-8">
                            ${summaryHtml ? `<div><div class="mb-4 sm:mb-6 pl-4 border-l-4 border-blue-600"><h3 class="text-sm font-bold text-blue-800 uppercase mb-2">Profile</h3><p class="text-sm text-gray-600">${d.summary}</p></div></div>` : ''}
                            ${experiencesHtml ? `<div class="pl-4 border-l-4 border-blue-600"><h3 class="text-sm font-bold text-blue-800 uppercase mb-4">Experience</h3>${experiencesHtml}</div>` : ''}
                            ${projectsHtml ? `<div class="pl-4 border-l-4 border-blue-600"><h3 class="text-sm font-bold text-blue-800 uppercase mb-2">Projects</h3>${projectsHtml}</div>` : ''}
                        </div>
                        <div class="w-full sm:w-5/12 flex flex-col gap-6 sm:gap-8 flex-shrink-0">
                            ${educationsHtml ? `<div class="pl-4 border-l-4 border-gray-200"><h3 class="text-sm font-bold text-gray-500 uppercase mb-4">Education</h3>${educationsHtml}</div>` : ''}
                            ${skillsHtml ? `<div class="pl-4 border-l-4 border-gray-200"><h3 class="text-sm font-bold text-gray-500 uppercase mb-4">Skills</h3><p class="text-sm text-gray-600">${d.skills}</p></div>` : ''}
                            ${[d.email, d.phone, d.location].filter(x=>x).length > 0 ? `<div class="pl-4 border-l-4 border-gray-200"><h3 class="text-sm font-bold text-gray-500 uppercase mb-4">Contact</h3><p class="text-sm text-gray-600">${[d.email, d.phone, d.location].filter(x=>x).join('<br>')}</p></div>` : ''}
                        </div>
                    </div>
                </div>`;
            },

            'i3': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations, true);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);

                return `<div class="a4-padding h-full flex flex-col bg-white font-lato">
                    <div class="border-b-2 border-blue-500 pb-4 sm:pb-6 mb-6 sm:mb-8 flex-shrink-0">
                        <h1 class="text-4xl font-bold text-blue-600 uppercase">${d.name}</h1>
                        <p class="text-sm font-bold text-gray-500 uppercase">${d.title}</p>
                        <div class="text-xs text-gray-400 mt-2">${[d.email, d.phone, d.location].filter(x=>x).join(' | ')}</div>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-6 sm:gap-10 flex-grow">
                        <div class="w-full sm:w-2/3 flex flex-col gap-6 sm:gap-8">
                            ${summaryHtml ? `<div><h3 class="text-sm font-bold text-blue-500 uppercase mb-3 border-b border-gray-200 pb-1">Summary</h3><p class="text-sm text-gray-600 mb-6">${d.summary}</p></div>` : ''}
                            ${experiencesHtml ? `<div><h3 class="text-sm font-bold text-blue-500 uppercase mb-4 border-b border-gray-200 pb-1">Experience</h3>${experiencesHtml}</div>` : ''}
                            ${projectsHtml ? `<div><h3 class="text-sm font-bold text-blue-500 uppercase mb-2 border-b border-gray-200 pb-1">Projects</h3>${projectsHtml}</div>` : ''}
                        </div>
                        <div class="w-full sm:w-1/3 bg-gray-50 p-4 sm:p-6 rounded-lg flex flex-col gap-6 sm:gap-8 flex-shrink-0">
                            ${educationsHtml ? `<div><h3 class="text-xs font-bold text-blue-500 uppercase mb-4 border-b border-blue-200 pb-1">Education</h3>${educationsHtml}</div>` : ''}
                            ${skillsHtml ? `<div><h3 class="text-xs font-bold text-blue-500 uppercase mb-4 border-b border-blue-200 pb-1">Skills</h3><p class="text-xs text-gray-600">${d.skills}</p></div>` : ''}
                        </div>
                    </div>
                </div>`;
            },
            
            'p1': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);

                return `<div class="a4-padding h-full font-serif flex flex-col justify-start gap-4 sm:gap-6">
                    <div class="text-center border-b-2 border-purple-900 pb-4 mb-4 sm:mb-6 flex-shrink-0">
                        <h1 class="text-4xl font-bold text-purple-900 uppercase">${d.name}</h1>
                        <p class="text-sm tracking-widest text-gray-600">${d.title}</p>
                    </div>
                    <div class="flex-grow flex flex-col gap-4 sm:gap-6">
                        ${summaryHtml ? `<div><p class="text-sm text-center mb-4 sm:mb-6">${d.summary}</p></div>` : ''}
                        ${experiencesHtml ? `<div><h3 class="font-bold uppercase text-center mb-2">Experience</h3>${experiencesHtml}</div>` : ''}
                        <div class="flex flex-col sm:flex-row justify-between text-sm">
                            ${educationsHtml ? `<div class="w-full sm:w-1/2 pr-0 sm:pr-4 mb-4 sm:mb-0"><h3>Education</h3>${educationsHtml}</div>` : ''}
                            ${skillsHtml ? `<div class="w-full sm:w-1/2 pl-0 sm:pl-4"><h3>Skills</h3><p>${d.skills}</p></div>` : ''}
                        </div>
                        ${projectsHtml ? `<div class="text-center border-t pt-4 mt-4"><h3 class="font-bold uppercase mb-2">Projects</h3>${projectsHtml}</div>` : ''}
                    </div>
                </div>`;
            },

            'p2': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);

                return `<div class="h-full bg-white font-sans flex flex-col">
                    <div class="bg-[#2c3e50] text-white p-6 sm:p-10 flex-shrink-0">
                        <h1 class="text-4xl sm:text-5xl font-bold">${d.name}</h1>
                        <div class="w-12 h-1 bg-purple-500 mb-4"></div>
                        <p class="text-lg sm:text-xl text-gray-300">${d.title}</p>
                    </div>
                    <div class="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10 flex-grow">
                        <div class="col-span-1 lg:col-span-2 flex flex-col gap-6 sm:gap-8">
                            ${summaryHtml ? `<div><p class="text-sm text-gray-600 mb-4 sm:mb-8">${d.summary}</p></div>` : ''}
                            ${experiencesHtml ? `<div><h3 class="font-bold mb-2 border-b pb-1">Experience</h3>${experiencesHtml}</div>` : ''}
                            ${projectsHtml ? `<div><h3 class="font-bold mb-2 border-b pb-1">Projects</h3>${projectsHtml}</div>` : ''}
                        </div>
                        <div class="col-span-1 bg-gray-50 p-4 text-sm flex flex-col gap-6 sm:gap-8 flex-shrink-0">
                            ${educationsHtml ? `<div><h3 class="font-bold mb-2">Education</h3>${educationsHtml}</div>` : ''}
                            ${skillsHtml ? `<div><h3 class="font-bold mb-2">Skills</h3><p>${d.skills}</p></div>` : ''}
                            ${[d.email, d.phone, d.location].filter(x=>x).length > 0 ? `<div><h3 class="font-bold mb-2">Contact</h3><p>${[d.email, d.phone, d.location].filter(x=>x).join('<br>')}</p></div>` : ''}
                        </div>
                    </div>
                </div>`;
            },
            
            'p3': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);

                return `<div class="a4-padding h-full font-serif flex flex-col justify-start gap-4 sm:gap-6">
                    <div class="text-center mb-6 sm:mb-8 flex-shrink-0">
                        <h1 class="text-3xl font-bold uppercase tracking-widest">${d.name}</h1>
                        <p class="text-xs font-sans tracking-widest text-gray-500 uppercase">${d.title}</p>
                    </div>
                    <div class="flex-grow flex flex-col gap-4 sm:gap-6">
                        ${summaryHtml ? `<div><p class="text-sm italic text-center text-gray-600 mb-4 sm:mb-8">${d.summary}</p></div>` : ''}
                        <div class="border-t border-b py-2 sm:py-4 my-2 sm:my-4 text-center text-xs font-sans">${[d.email, d.phone, d.location].filter(x=>x).join(' • ')}</div>
                        ${experiencesHtml ? `<div><h3 class="font-bold uppercase text-center mb-2">Experience</h3>${experiencesHtml}</div>` : ''}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 text-center">
                            ${educationsHtml ? `<div><h3>Education</h3>${educationsHtml}</div>` : ''}
                            ${skillsHtml ? `<div><h3>Skills</h3><p>${d.skills}</p></div>` : ''}
                        </div>
                        ${projectsHtml ? `<div class="text-center mt-4"><h3 class="font-bold uppercase mb-2">Projects</h3>${projectsHtml}</div>` : ''}
                    </div>
                </div>`;
            },
            
            'p4': (d) => {
                const experiencesHtml = renderExperiences(d.experiences);
                const educationsHtml = renderEducations(d.educations);
                const projectsHtml = renderProjects(d.projects);
                const skillsHtml = renderSkills(d.skills);
                const summaryHtml = renderSummary(d.summary);

                return `<div class="a4-padding h-full font-lato flex flex-col justify-start gap-4 sm:gap-6">
                    <div class="text-center border-b pb-4 mb-4 flex-shrink-0">
                        <h1 class="text-4xl font-bold text-gray-900 uppercase tracking-wide">${d.name}</h1>
                        <h2 class="text-xl font-bold text-gray-700 mt-2">${d.title}</h2>
                        <div class="text-sm text-gray-600 mt-2">${[d.location, d.email, d.phone].filter(x=>x).join(' • ')}</div>
                    </div>
                    <div class="flex-grow flex flex-col gap-4 sm:gap-6">
                        ${summaryHtml ? `<div class="mb-2"><h3 class="text-sm font-bold text-gray-800 uppercase border-b border-gray-300 pb-1 mb-2">Professional Summary</h3>${summaryHtml}</div>` : ''}
                        ${experiencesHtml ? `<div><h3 class="text-sm font-bold text-gray-800 uppercase border-b border-gray-300 pb-1 mb-2">Professional Experience</h3>${experiencesHtml}</div>` : ''}
                        ${projectsHtml ? `<div class="mb-2"><h3 class="text-sm font-bold text-gray-800 uppercase border-b border-gray-300 pb-1 mb-2">Selected Project Experience</h3>${projectsHtml}</div>` : ''}
                        ${educationsHtml ? `<div class="mb-2"><h3 class="text-sm font-bold text-gray-800 uppercase border-b border-gray-300 pb-1 mb-2">Education</h3>${educationsHtml}</div>` : ''}
                        ${skillsHtml ? `<div><h3 class="text-sm font-bold text-gray-800 uppercase border-b border-gray-300 pb-1 mb-2">Additional Information</h3><p class="text-xs text-gray-700"><span class="font-bold">Technical Skills:</span> ${d.skills}</p></div>` : ''}
                    </div>
                </div>`;
            }
        };


        // हर template में div को class add करो
const previewHTML = `
  <div class="personal-info resume-section">
    <!-- content -->
  </div>
  
  <div class="summary resume-section">
    <!-- content -->
  </div>
  
  <div class="experience resume-content">
    <!-- experience entries -->
  </div>
`;

function applyPdfStyles() {
  const el = document.getElementById("resume-content");
  const scaleWrapper = document.getElementById("resume-scale-wrapper");

  // FORCE EXACT A4 SIZING
  scaleWrapper.style.transform = "none";
  scaleWrapper.style.width = "794px";  // exact px A4 width
  scaleWrapper.style.minHeight = "1122px";

  // HIGH QUALITY TEXT
  el.style.lineHeight = "1.5";
  el.style.letterSpacing = "0px";
}



function restoreStyles(old) {
  const el = document.getElementById("resume-content");
  const scaleWrapper = document.getElementById("resume-scale-wrapper");
  const wrapper = document.getElementById("resume-preview-wrapper");

  // restore text
  el.style.lineHeight = old.lineHeight;
  el.style.letterSpacing = old.letterSpacing;

  // restore transforms
  wrapper.style.transform = old.wrapperTransform;
  scaleWrapper.style.transform = old.scaleTransform;

  // restore size
  scaleWrapper.style.width = old.width;
  scaleWrapper.style.minHeight = old.minHeight;

  // re-apply responsive scaling
  autoFitContent();
}

