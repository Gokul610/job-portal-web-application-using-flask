document.addEventListener('DOMContentLoaded', () => {

    let currentUser = null;
    let userPreferences = { preferred_location: null, preferred_roles: [] };
    let appliedJobs = new Set();

 
    const jobListingsContainer = document.getElementById('job-listings-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const navButtons = document.getElementById('nav-buttons');
    const modals = document.querySelectorAll('.modal');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const resendVerificationContainer = document.getElementById('resend-verification-container');
    const registerModal = document.getElementById('register-modal');
    const registerForm = document.getElementById('register-form');
    const registerErrorMsg = document.getElementById('register-error-msg');
    const registerContent = document.getElementById('register-content');
    const registerSuccess = document.getElementById('register-success');
    const registerSuccessMessage = document.getElementById('register-success-message');
    const verificationSuccessModal = document.getElementById('verification-success-modal');
    let currentRegisterStep = 0;
    const applyModal = document.getElementById('apply-modal');
    const applyForm = document.getElementById('apply-form');
    const applyErrorMsg = document.getElementById('apply-error-msg');
    const applyModalTitle = document.getElementById('apply-modal-title');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
    const deleteCancelBtn = document.getElementById('delete-cancel-btn');
    const deleteConfirmText = document.getElementById('delete-confirm-text');
    const successToast = document.getElementById('success-toast');
    const toastMessage = document.getElementById('toast-message');

   
    const API_BASE_URL = 'http://127.0.0.1:5000';
    const parseJwt = (token) => {
        try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
    };

    const apiFetch = async (endpoint, options = {}) => {
        const token = localStorage.getItem('jwtToken');
        const headers = { ...options.headers };
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'An error occurred.');
            return data;
        } else {
             if (!response.ok) throw new Error('An HTTP error occurred.');
             return null;
        }
    };

    const showToast = (message) => {
        toastMessage.textContent = message;
        successToast.classList.remove('hidden');
        setTimeout(() => {
            successToast.classList.add('hidden');
        }, 3000);
    };

   
    const initialize = async () => {
        await checkLoginStatus();
        await fetchAndDisplayJobs(searchInput.value.trim());

       
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('verified') === 'true') {
            verificationSuccessModal.classList.remove('hidden');
           
            window.history.replaceState({}, document.title, "/");
        }
    };

    const checkLoginStatus = async () => {
        const token = localStorage.getItem('jwtToken');
        currentUser = token ? parseJwt(token) : null;
        if (currentUser) {
            updateUIToLoggedIn();
            if (currentUser.user_type === 3) await fetchUserApplications();
        } else {
            updateUIToLoggedOut();
            appliedJobs.clear();
        }
        setupFooter();
    };

    const fetchAndDisplayJobs = async (searchTerm = '') => {
        loadingIndicator.style.display = 'block';
        jobListingsContainer.innerHTML = '';
        if (currentUser && currentUser.user_type === 3) await fetchUserPreferences();
        try {
            const jobs = await apiFetch(`/api/jobs?search=${encodeURIComponent(searchTerm)}`);
            displayJobs(jobs);
        } catch (error) {
            jobListingsContainer.innerHTML = `<p class="col-span-full text-center text-red-500">${error.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    const displayJobs = (jobs) => {
        if (!jobs || jobs.length === 0) {
            jobListingsContainer.innerHTML = `<p class="loading-indicator">No jobs found.</p>`;
            return;
        }
        const sortedJobs = sortJobsByPreference(jobs);
        jobListingsContainer.innerHTML = sortedJobs.map(job => {
            const deadline = job.application_deadline ? new Date(job.application_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const skills = job.skills_required ? job.skills_required.split(',').map(skill => `<span class="skill-tag">${skill.trim()}</span>`).join('') : '';
            let actionButton = '';
            if (currentUser) {
                if (currentUser.user_type === 1) {
                    actionButton = `<button data-job-id="${job.job_id}" data-job-title="${job.job_title}" class="btn btn-danger delete-btn">Delete</button>`;
                } else if (currentUser.user_type === 3) {
                    actionButton = appliedJobs.has(job.job_id)
                        ? `<button class="btn applied-btn" disabled>Applied</button>`
                        : `<button data-job-id="${job.job_id}" data-job-title="${job.job_title}" data-company-name="${job.company_name}" class="btn btn-apply apply-btn">Apply Now</button>`;
                }
            }
            return `<div class="job-card">
                <div>
                    <h3 class="job-title">${job.job_title}</h3>
                    <p class="company-name">${job.company_name}</p>
                    <div class="job-details">
                        <p><i class="fa-solid fa-location-dot"></i> ${job.location || 'N/A'}</p>
                        <p><i class="fa-solid fa-briefcase"></i> ${job.job_type || 'N/A'}</p>
                        <p><i class="fa-solid fa-indian-rupee-sign"></i> ${job.salary_range || 'Not Disclosed'}</p>
                    </div>
                    <div class="job-skills">${skills}</div>
                </div>
                <div class="job-footer"><span>Deadline: ${deadline}</span></div>
                ${actionButton}
            </div>`;
        }).join('');
    };

    const fetchUserApplications = async () => {
        try { appliedJobs = new Set(await apiFetch('/api/user/applications')); } catch (e) { console.error("Could not fetch applications", e); }
    };
    const fetchUserPreferences = async () => {
        try { userPreferences = await apiFetch('/api/user/preferences'); } catch (e) { console.error("Could not fetch preferences", e); }
    };

    const sortJobsByPreference = (jobs) => {
        if (!currentUser || currentUser.user_type !== 3 || (!userPreferences.preferred_location && userPreferences.preferred_roles.length === 0)) {
            return jobs;
        }
        const { preferred_location, preferred_roles } = userPreferences;
        const lowerCaseRoles = preferred_roles.map(r => r.toLowerCase());
        const lowerCaseLocation = preferred_location ? preferred_location.toLowerCase() : null;
        const getScore = (job) => {
            const jobTitle = job.job_title.toLowerCase();
            const jobLocation = job.location.toLowerCase();
            const hasRole = lowerCaseRoles.some(role => jobTitle.includes(role));
            const hasLocation = lowerCaseLocation && jobLocation.includes(lowerCaseLocation);
            if (hasRole && hasLocation) return 4;
            if (hasRole) return 3;
            if (hasLocation) return 2;
            return 1;
        };
        return [...jobs].sort((a, b) => getScore(b) - getScore(a));
    };


    function updateUIToLoggedIn() {
        navButtons.innerHTML = `
            <a href="/" class="btn btn-secondary">Home</a>
            <a id="dashboard-link" href="#" class="btn btn-secondary">Dashboard</a>
            <button id="nav-logout-btn" class="btn btn-primary">Log Out</button>
        `;
        document.getElementById('nav-logout-btn').addEventListener('click', handleLogout);
        document.getElementById('dashboard-link').addEventListener('click', handleDashboardRedirect);
    }
    function updateUIToLoggedOut() {
        navButtons.innerHTML = `<button id="nav-login-btn" class="btn btn-secondary">Log In</button><button id="nav-register-btn" class="btn btn-primary">Register</button>`;
        document.getElementById('nav-login-btn').addEventListener('click', () => loginModal.classList.remove('hidden'));
        document.getElementById('nav-register-btn').addEventListener('click', () => {
            registerContent.classList.remove('hidden');
            registerSuccess.classList.add('hidden');
            registerForm.reset();
            showRegisterStep(0);
            registerModal.classList.remove('hidden');
        });
    }

    const setupFooter = () => {
        const postJobLink = document.getElementById('footer-post-job-link');
        const createProfileLink = document.getElementById('footer-create-profile-link');
        const employerLoginLink = document.getElementById('footer-employer-login-link');

        const openLogin = (e) => { e.preventDefault(); loginModal.classList.remove('hidden'); };
        const openRegister = (e) => { e.preventDefault(); registerModal.classList.remove('hidden'); };

        if (currentUser) {
            if (currentUser.user_type === 3) { // Job Seeker
                postJobLink.onclick = (e) => { e.preventDefault(); showToast('Only employers can post jobs.'); };
                employerLoginLink.onclick = openLogin;
            } else { // Employer or Admin
                postJobLink.href = currentUser.user_type === 1 ? '/admin_dashboard' : '/employer_dashboard';
                employerLoginLink.href = currentUser.user_type === 1 ? '/admin_dashboard' : '/employer_dashboard';
            }
            createProfileLink.href = '/job_seeker_dashboard';
        } else { // Logged out
            postJobLink.onclick = openLogin;
            createProfileLink.onclick = openRegister;
            employerLoginLink.onclick = openLogin;
        }
    };


    const handleDashboardRedirect = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('jwtToken');
        if (token) {
            const user = parseJwt(token);
            if (user.user_type === 1) window.location.href = '/admin_dashboard';
            else if (user.user_type === 2) window.location.href = '/employer_dashboard';
            else if (user.user_type === 3) window.location.href = '/job_seeker_dashboard';
            else window.location.href = '/';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        loginErrorMsg.textContent = '';
        resendVerificationContainer.innerHTML = '';
        try {
            const data = await apiFetch('/api/login', {
                method: 'POST', body: JSON.stringify({ email: loginForm.elements['login-email'].value, password: loginForm.elements['login-password'].value })
            });
            localStorage.setItem('jwtToken', data.access_token);
            loginModal.classList.add('hidden'); loginForm.reset();
            await initialize();
        } catch (error) {
            loginErrorMsg.textContent = error.message;
            if (error.message.includes('awaiting email verification')) {
                const resendBtn = document.createElement('button');
                resendBtn.textContent = 'Click here to verify your Gmail';
                resendBtn.className = 'text-indigo-600 hover:underline text-sm mt-2';
                resendBtn.type = 'button';
                resendVerificationContainer.appendChild(resendBtn);
                resendBtn.onclick = () => handleResendVerification(loginForm.elements['login-email'].value);
            }
        }
    };

    const handleResendVerification = async (email) => {
        if (!email) { showToast("Please enter your email address first."); return; }
        try {
            const result = await apiFetch('/api/resend-verification', { method: 'POST', body: JSON.stringify({ email: email }) });
            showToast(result.msg);
        } catch (error) { showToast(error.message); }
    };

    const handleLogout = async () => { localStorage.removeItem('jwtToken'); window.location.href = '/'; };

    const handleApplyClick = async (e) => {
        const { jobId, jobTitle, companyName } = e.target.dataset;
        applyModalTitle.textContent = `Apply for ${jobTitle} at ${companyName}`;
        applyForm.elements['apply-job-id'].value = jobId;
        try {
            const profile = await apiFetch('/api/user/profile');
            if (profile && profile.email) {
                applyForm.elements['apply-name'].value = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                applyForm.elements['apply-email'].value = profile.email || '';
                applyForm.elements['gender'].value = profile.gender || '';
                applyForm.elements['preferred_location'].value = profile.preferred_location || '';
            }
        } catch (error) { console.error('Failed to fetch profile:', error); }
        applyModal.classList.remove('hidden');
    };

    const handleApplySubmit = async (e) => {
        e.preventDefault();
        applyErrorMsg.textContent = '';
        const jobId = parseInt(applyForm.elements['apply-job-id'].value);
        const formData = new FormData(applyForm);
        try {
            const result = await apiFetch(`/api/jobs/${jobId}/apply`, { method: 'POST', body: formData });
            showToast(result.msg);
            applyModal.classList.add('hidden');
            applyForm.reset();
            appliedJobs.add(jobId);
            const appliedButton = jobListingsContainer.querySelector(`button.apply-btn[data-job-id="${jobId}"]`);
            if (appliedButton) {
                appliedButton.textContent = 'Applied';
                appliedButton.disabled = true;
                appliedButton.classList.remove('btn-apply', 'apply-btn');
                appliedButton.classList.add('applied-btn');
            }
        } catch (error) { applyErrorMsg.textContent = error.message; }
    };

    const handleDeleteClick = (e) => {
        const { jobId, jobTitle } = e.target.dataset;
        deleteConfirmText.textContent = `Are you sure you want to delete the job post for "${jobTitle}"? This action cannot be undone.`;
        deleteConfirmBtn.dataset.jobId = jobId;
        deleteConfirmModal.classList.remove('hidden');
    };

    const executeDelete = async () => {
        const jobId = deleteConfirmBtn.dataset.jobId;
        if (!jobId) return;
        try {
            const result = await apiFetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
            showToast(result.msg);
            const cardToRemove = jobListingsContainer.querySelector(`button.delete-btn[data-job-id="${jobId}"]`);
            if (cardToRemove) {
                cardToRemove.closest('.job-card').remove();
            }
        } catch (error) {
            showToast(`Error: ${error.message}`);
        }
        finally {
            deleteConfirmModal.classList.add('hidden');
            deleteConfirmBtn.dataset.jobId = '';
        }
    };

 
    loginForm.addEventListener('submit', handleLogin);
    searchForm.addEventListener('submit', (e) => { e.preventDefault(); fetchAndDisplayJobs(searchInput.value.trim()); });
    applyForm.addEventListener('submit', handleApplySubmit);
    jobListingsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.classList.contains('apply-btn')) handleApplyClick(e);
        if (target.classList.contains('delete-btn')) handleDeleteClick(e);
    });
    deleteConfirmBtn.addEventListener('click', executeDelete);
    deleteCancelBtn.addEventListener('click', () => deleteConfirmModal.classList.add('hidden'));

    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal-btn')) {
                modal.classList.add('hidden');
            }
        });
    });

    const registerSteps = [document.getElementById('step-1'), document.getElementById('step-2'), document.getElementById('step-3')];
    const progressIndicators = [document.getElementById('progress-1'), document.getElementById('progress-2'), document.getElementById('progress-3')];
    const showRegisterStep = (stepIndex) => {
        registerSteps.forEach((s, i) => s.classList.toggle('hidden', i !== stepIndex));
        progressIndicators.forEach((p, i) => {
            p.classList.remove('active', 'completed');
            if(i < stepIndex) p.classList.add('completed');
            if(i === stepIndex) p.classList.add('active');
        });
        currentRegisterStep = stepIndex;
    };
    registerModal.querySelectorAll('.next-step-btn').forEach(btn => btn.addEventListener('click', () => {
        const currentStepEl = registerSteps[currentRegisterStep];
        const inputs = currentStepEl.querySelectorAll('input[required]');
        let isValid = Array.from(inputs).every(input => input.reportValidity());
        if (currentRegisterStep === 0) {
            const pass = registerForm.elements['register-password'].value;
            const confirmPass = registerForm.elements['register-confirm-password'].value;
            if (pass !== confirmPass) {
                registerErrorMsg.textContent = "Passwords do not match.";
                isValid = false;
            } else {
                registerErrorMsg.textContent = "";
            }
        }
        if(isValid) showRegisterStep(currentRegisterStep + 1);
    }));
    registerModal.querySelectorAll('.prev-step-btn').forEach(btn => btn.addEventListener('click', () => showRegisterStep(currentRegisterStep - 1)));

    document.querySelectorAll('input[name="userType"]').forEach(radio => radio.addEventListener('change', (e) => {
        const isEmployer = e.target.value === '2';
        document.getElementById('personal-details-fields').classList.toggle('hidden', isEmployer);
        document.getElementById('employer-field').classList.toggle('hidden', !isEmployer);
        document.querySelector('input[name="register-education"]').required = !isEmployer;
        document.querySelector('input[name="register-company"]').required = isEmployer;
    }));

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerErrorMsg.textContent = '';
        const data = {
            email: registerForm.elements['register-email'].value, password: registerForm.elements['register-password'].value,
            firstName: registerForm.elements['register-first-name'].value, lastName: registerForm.elements['register-last-name'].value,
            dob: registerForm.elements['register-dob'].value, userType: parseInt(registerForm.elements['userType'].value),
            education: registerForm.elements['register-education'].value, companyName: registerForm.elements['register-company'].value
        };
        try {
            const result = await apiFetch('/api/register', { method: 'POST', body: JSON.stringify(data) });
            registerSuccessMessage.textContent = result.msg;
            registerContent.classList.add('hidden');
            registerSuccess.classList.remove('hidden');
        } catch (error) { registerErrorMsg.textContent = error.message; }
    });

    document.getElementById('close-success-btn').addEventListener('click', () => {
        registerModal.classList.add('hidden');
    });

    document.getElementById('verified-login-btn').addEventListener('click', () => {
        verificationSuccessModal.classList.add('hidden');
        loginModal.classList.remove('hidden');
    });

    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-password')) {
            const icon = e.target;
            const input = icon.closest('.password-container').querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    });


    initialize();
});
