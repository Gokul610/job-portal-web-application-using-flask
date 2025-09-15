document.addEventListener('DOMContentLoaded', () => {

    const navButtons = document.getElementById('nav-buttons');
    const mainDashboardView = document.getElementById('main-dashboard-view');
    const applicantsView = document.getElementById('applicants-view');
    const jobPostingsContainer = document.getElementById('job-postings-container');
    const loadingJobsIndicator = document.getElementById('loading-jobs-indicator');
    const applicantsContainer = document.getElementById('applicants-container');
    const loadingApplicantsIndicator = document.getElementById('loading-applicants-indicator');
    const applicantsTitle = document.getElementById('applicants-title');
    const successToast = document.getElementById('success-toast');
    const toastMessage = document.getElementById('toast-message');
    const editProfileModal = document.getElementById('edit-employer-profile-modal');
    const editProfileForm = document.getElementById('edit-employer-profile-form');
    const changePasswordForm = document.getElementById('employer-change-password-form');
    const createJobModal = document.getElementById('create-job-modal');
    const createJobForm = document.getElementById('create-job-form');
    const resumeViewerModal = document.getElementById('resume-viewer-modal');
    const resumeIframe = document.getElementById('resume-iframe');
    const downloadResumeBtn = document.getElementById('download-resume-btn');
    const deleteJobModal = document.getElementById('delete-job-confirm-modal');
    const deleteJobConfirmBtn = document.getElementById('delete-job-confirm-btn');

    const API_BASE_URL = 'http://127.0.0.1:5000';

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
        setTimeout(() => successToast.classList.add('hidden'), 3000);
    };

    const initialize = async () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) { window.location.href = '/'; return; }
        updateUIToLoggedIn();
        setupFooter();
        await fetchAndDisplayEmployerJobs();
    };

    function updateUIToLoggedIn() {
        navButtons.innerHTML = `
            <a href="/" style="font-size: 0.875rem; font-weight: 500; color: #374151;">Home</a>
            <a href="/employer_dashboard" style="font-size: 0.875rem; font-weight: 600; color: #4f46e5;">Dashboard</a>
            <button id="nav-logout-btn" class="button primary-button" style="padding: 0.5rem 1rem; font-size: 0.875rem;">Log Out</button>
        `;
        document.getElementById('nav-logout-btn').addEventListener('click', () => {
            localStorage.removeItem('jwtToken');
            window.location.href = '/';
        });
    }

    const setupFooter = () => {
        document.getElementById('footer-job-seekers').style.display = 'none';
        document.getElementById('footer-employers').style.display = 'block';
    };

    const fetchAndDisplayEmployerJobs = async () => {
        showView('main');
        loadingJobsIndicator.style.display = 'block';
        jobPostingsContainer.innerHTML = ''; 
        try {
            const jobs = await apiFetch('/api/employer/jobs');
            loadingJobsIndicator.style.display = 'none';
            if (jobs.length === 0) {
                jobPostingsContainer.innerHTML = '<p style="text-align: center; color: #6b7280;">You have not posted any jobs yet.</p>';
            } else {
                const statusClasses = { approved: 'status-approved', pending: 'status-pending', rejected: 'status-rejected' };
                jobPostingsContainer.innerHTML = jobs.map(job => `
                    <div class="job-item">
                        <div>
                            <p class="job-title">${job.job_title}</p>
                            <p class="job-date">Posted on: ${new Date(job.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="job-actions">
                            <span class="status-badge ${statusClasses[job.status] || ''}">${job.status}</span>
                            <button data-job-id="${job.job_id}" data-job-title="${job.job_title}" class="view-applicants-btn button blue-button">View Applicants</button>
                            <button data-job-id="${job.job_id}" class="delete-job-btn button" style="background-color:#fee2e2; color:#dc2626;">Delete</button>
                        </div>
                    </div>`).join('');
            }
        } catch (error) {
            loadingJobsIndicator.style.display = 'none';
            jobPostingsContainer.innerHTML = `<p style="color: #ef4444;">${error.message}</p>`;
        }
    };

    const showView = (viewName) => {
        mainDashboardView.classList.toggle('hidden', viewName !== 'main');
        applicantsView.classList.toggle('hidden', viewName !== 'applicants');
    };

    document.getElementById('edit-profile-btn').addEventListener('click', async () => {
        editProfileForm.reset();
        try {
            const profile = await apiFetch('/api/user/profile');
            if(profile) Object.keys(profile).forEach(key => { if(editProfileForm.elements[key]) editProfileForm.elements[key].value = profile[key] || ''; });
        } catch(e) { console.error(e); }
        editProfileModal.classList.remove('hidden');
    });

    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(editProfileForm));
        try {
            const result = await apiFetch('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) });
            showToast(result.msg);
            editProfileModal.classList.add('hidden');
        } catch(error) { document.getElementById('employer-profile-error-msg').textContent = error.message; }
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(changePasswordForm));
        try {
            const result = await apiFetch('/api/user/password', { method: 'PUT', body: JSON.stringify(data) });
            showToast(result.msg);
            changePasswordForm.reset();
        } catch(error) { document.getElementById('employer-password-error-msg').textContent = error.message; }
    });

    document.getElementById('create-job-btn').addEventListener('click', () => {
        createJobForm.reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('employer-app-deadline').setAttribute('min', today);
        createJobModal.classList.remove('hidden');
    });

    createJobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(createJobForm));
        try {
            const result = await apiFetch('/api/employer/jobs', { method: 'POST', body: JSON.stringify(data) });
            showToast(result.msg);
            createJobModal.classList.add('hidden');
            await fetchAndDisplayEmployerJobs();
        } catch(error) { document.getElementById('create-job-error-msg').textContent = error.message; }
    });

    jobPostingsContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if(target.classList.contains('view-applicants-btn')) {
            const { jobId, jobTitle } = target.dataset;
            showView('applicants');
            applicantsTitle.textContent = `Applicants for "${jobTitle}"`;
            loadingApplicantsIndicator.style.display = 'block';
            applicantsContainer.innerHTML = '';
            try {
                const applicants = await apiFetch(`/api/jobs/${jobId}/applicants`);
                loadingApplicantsIndicator.style.display = 'none';
                if(applicants.length === 0) {
                    applicantsContainer.innerHTML = '<p style="text-align: center; color: #6b7280;">No applicants yet for this position.</p>';
                } else {
                    applicantsContainer.innerHTML = applicants.map(app => `
                        <div class="applicant-item">
                            <div class="applicant-header">
                                <div>
                                    <p class="applicant-name">${app.first_name} ${app.last_name}</p>
                                    <p class="applicant-email">${app.email}</p>
                                    <p class="applicant-date">Applied: ${new Date(app.application_date).toLocaleDateString()}</p>
                                </div>
                                <button data-resume-url="${app.resume_url}" class="view-resume-btn button green-button">View Resume</button>
                            </div>
                            <div class="applicant-details">
                                <p><strong>Phone:</strong> ${app.phone_number || 'N/A'}</p>
                                <p><strong>Expected Salary:</strong> ${app.expected_salary || 'N/A'}</p>
                                <p><strong>Education:</strong> ${app.educational_qualification || 'N/A'}</p>
                                <p><strong>Skills:</strong> ${app.skills || 'N/A'}</p>
                            </div>
                        </div>`).join('');
                }
            } catch(error) {
                loadingApplicantsIndicator.style.display = 'none';
                applicantsContainer.innerHTML = `<p style="color: #ef4444;">${error.message}</p>`;
            }
        }
        if(target.classList.contains('delete-job-btn')) {
            const { jobId } = target.dataset;
            deleteJobConfirmBtn.dataset.jobId = jobId;
            deleteJobModal.classList.remove('hidden');
        }
    });

    applicantsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (target && target.classList.contains('view-resume-btn')) {
            const { resumeUrl } = target.dataset;
            if(resumeUrl && resumeUrl !== 'null') {
                resumeIframe.src = `${API_BASE_URL}/${resumeUrl}#toolbar=0`;
                downloadResumeBtn.href = `${API_BASE_URL}/${resumeUrl}`;
                resumeViewerModal.classList.remove('hidden');
            } else {
                showToast("No resume available for this applicant.");
            }
        }
    });

    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => showView('main'));
    deleteJobConfirmBtn.addEventListener('click', async (e) => {
        const { jobId } = e.target.dataset;
        try {
            const result = await apiFetch(`/api/jobs/${jobId}`, {method: 'DELETE'});
            showToast(result.msg);
            deleteJobModal.classList.add('hidden');
            await fetchAndDisplayEmployerJobs();
        } catch(error) { showToast(error.message); }
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if(e.target === modal || e.target.classList.contains('close-modal-btn') || e.target.id.includes('-cancel-btn')) {
                modal.classList.add('hidden');
            }
        });
    });

    initialize();
});
