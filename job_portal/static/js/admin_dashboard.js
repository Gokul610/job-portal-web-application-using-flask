document.addEventListener('DOMContentLoaded', () => {

    let currentPage = 1;
    let hasMoreJobs = true;

    
    const navButtons = document.getElementById('nav-buttons');
    const mainAdminView = document.getElementById('main-admin-view');
    const usersView = document.getElementById('users-view');
    const usersContainer = document.getElementById('users-container');
    const loadingUsersIndicator = document.getElementById('loading-users-indicator');
    const adminApplicantsView = document.getElementById('admin-applicants-view');
    const pendingAdminsContainer = document.getElementById('pending-admins-container');
    const loadingAdminsIndicator = document.getElementById('loading-admins-indicator');
    const pendingJobsContainer = document.getElementById('pending-jobs-container');
    const allJobsList = document.getElementById('all-jobs-list');
    const loadMoreContainer = document.getElementById('load-more-container');
    const successToast = document.getElementById('success-toast');
    const toastMessage = document.getElementById('toast-message');
    const createJobModal = document.getElementById('admin-create-job-modal');
    const createJobForm = document.getElementById('admin-create-job-form');
    const deleteJobModal = document.getElementById('admin-delete-job-confirm-modal');
    const deleteJobConfirmBtn = document.getElementById('admin-delete-job-confirm-btn');
    const deleteJobConfirmText = document.getElementById('delete-job-confirm-text');
    const deleteUserModal = document.getElementById('admin-delete-user-confirm-modal');
    const deleteUserConfirmBtn = document.getElementById('admin-delete-user-confirm-btn');
    const deleteUserConfirmText = document.getElementById('delete-user-confirm-text');
    const resumeViewerModal = document.getElementById('admin-resume-viewer-modal');
    const resumeIframe = document.getElementById('admin-resume-iframe');
    const downloadResumeBtn = document.getElementById('admin-download-resume-btn');

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

    const showView = (viewName) => {
        mainAdminView.classList.toggle('hidden', viewName !== 'main');
        usersView.classList.toggle('hidden', viewName !== 'users');
        adminApplicantsView.classList.toggle('hidden', viewName !== 'applicants');
    };

    const initialize = async () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) { window.location.href = '/'; return; }
        updateUIToLoggedIn();
        setupFooter();
        await fetchPendingAdmins();
        await fetchPendingJobs();
        await fetchAllJobs(true);
    };

    function updateUIToLoggedIn() {
        navButtons.innerHTML = `
            <a href="/" class="button">Home</a>
            <a href="/admin_dashboard" class="button">Dashboard</a>
            <button id="nav-logout-btn" class="button primary-button">Log Out</button>
        `;
        document.getElementById('nav-logout-btn').addEventListener('click', () => {
            localStorage.removeItem('jwtToken');
            window.location.href = '/';
        });
    }

    function setupFooter() {
        document.getElementById('footer-job-seekers').style.display = 'block';
        document.getElementById('footer-employers').style.display = 'block';
    }

    const fetchPendingAdmins = async () => {
        loadingAdminsIndicator.style.display = 'block';
        try {
            const users = await apiFetch('/api/admin/pending-users');
            loadingAdminsIndicator.style.display = 'none';
            if(users.length === 0) {
                pendingAdminsContainer.innerHTML = '<p class="text-gray-500">No new admin requests.</p>';
            } else {
                pendingAdminsContainer.innerHTML = users.map(user => `
                    <div id="pending-user-${user.user_id}" class="list-item">
                        <div class="list-item-content"><p class="font-semibold">${user.first_name} ${user.last_name}</p><p class="text-sm text-gray-600">${user.email}</p></div>
                        <div class="list-item-actions">
                            <button data-user-id="${user.user_id}" class="approve-user-btn button action-button-sm approve-btn">Approve</button>
                            <button data-user-id="${user.user_id}" class="reject-user-btn button action-button-sm reject-btn">Reject</button>
                        </div>
                    </div>`).join('');
            }
        } catch (error) {
            loadingAdminsIndicator.style.display = 'none';
            pendingAdminsContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    };

    const fetchPendingJobs = async () => {
        const loadingIndicator = document.getElementById('loading-pending-indicator');
        loadingIndicator.style.display = 'block';
        try {
            const jobs = await apiFetch('/api/admin/pending-jobs');
            loadingIndicator.style.display = 'none';
            if(jobs.length === 0) {
                pendingJobsContainer.innerHTML = '<p class="text-gray-500">No jobs are currently pending approval.</p>';
            } else {
                pendingJobsContainer.innerHTML = jobs.map(job => `
                    <div id="pending-job-${job.job_id}" class="list-item">
                        <div class="list-item-content"><p class="font-semibold">${job.job_title}</p><p class="text-sm text-gray-600">${job.company_name}</p></div>
                        <div class="list-item-actions">
                            <button data-job-id="${job.job_id}" class="approve-btn button action-button-sm approve-btn">Approve</button>
                            <button data-job-id="${job.job_id}" class="reject-btn button action-button-sm reject-btn">Reject</button>
                        </div>
                    </div>`).join('');
            }
        } catch (error) {
            loadingIndicator.style.display = 'none';
            pendingJobsContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    };

    const fetchAllJobs = async (isInitial = false) => {
        if(isInitial) {
            currentPage = 1;
            hasMoreJobs = true;
            allJobsList.innerHTML = '';
        }
        if(!hasMoreJobs) return;
        const loadingIndicator = document.getElementById('loading-all-jobs-indicator');
        loadingIndicator.style.display = 'block';
        loadMoreContainer.innerHTML = '';
        try {
            const data = await apiFetch(`/api/admin/all-jobs?page=${currentPage}`);
            const statusClasses = { approved: 'status-approved', pending: 'status-pending', rejected: 'status-rejected', active: 'status-active' };
            data.jobs.forEach(job => {
                const jobEl = document.createElement('div');
                jobEl.id = `all-job-${job.job_id}`;
                jobEl.className = 'list-item';
                jobEl.innerHTML = `
                    <div class="list-item-content"><p class="font-semibold">${job.job_title}</p><p class="text-sm text-gray-600">${job.company_name}</p></div>
                    <div class="list-item-actions">
                        <span class="status-text ${statusClasses[job.status] || ''}">${job.status}</span>
                        <button data-job-id="${job.job_id}" data-job-title="${job.job_title}" class="admin-view-applicants-btn button action-button-sm view-applicants-btn">View Applicants</button>
                        <button data-job-id="${job.job_id}" data-job-title="${job.job_title}" class="delete-job-btn button action-button-sm delete-btn">Delete</button>
                    </div>`;
                allJobsList.appendChild(jobEl);
            });
            hasMoreJobs = data.has_more;
            if(hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button id="load-more-btn" class="button secondary-button">Load More</button>`;
            }
            currentPage++;
        } catch(error) {
            allJobsList.innerHTML += `<p class="error-message">${error.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    const fetchAllEmployers = async () => {
        try {
            const employers = await apiFetch('/api/admin/employers');
            const selectEl = createJobForm.querySelector('select[name="employer_id"]');
            selectEl.innerHTML = '<option value="">Select an employer to post on behalf of</option>';
            employers.forEach(emp => {
                selectEl.innerHTML += `<option value="${emp.user_id}">${emp.company_name} (${emp.email})</option>`;
            });
        } catch(e) { console.error(e); }
    };

    const fetchAndDisplayUsers = async () => {
        showView('users');
        loadingUsersIndicator.style.display = 'block';
        usersContainer.innerHTML = '';
        try {
            const users = await apiFetch('/api/admin/users');
            loadingUsersIndicator.style.display = 'none';
            const userTypes = { 1: 'Admin', 2: 'Employer', 3: 'Job Seeker' };
            const statusClasses = { active: 'status-active', pending_approval: 'status-pending', rejected: 'status-rejected' };
            const flagClasses = { active: 'status-active', unverified: 'status-unverified' };

            usersContainer.innerHTML = `
                <div class="table-wrapper">
                    <table class="users-table">
                        <thead><tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Registered On</th>
                            <th>Actions</th>
                        </tr></thead>
                        <tbody>
                        ${users.map(user => {
                            let name = (user.user_type === 3 || user.user_type === 1) ? `${user.first_name || ''} ${user.last_name || ''}`.trim() :
                                         user.user_type === 2 ? user.company_name || user.contact_first_name : 'N/A';
                            return `<tr id="user-row-${user.user_id}">
                                <td><div class="font-medium">${name || 'N/A'}</div><div class="text-sm text-gray-500">${user.email}</div></td>
                                <td><span class="role-badge">${userTypes[user.user_type]}</span></td>
                                <td>
                                    <div>Approval: <span class="font-bold ${statusClasses[user.status] || ''}">${user.status}</span></div>
                                    <div>Email: <span class="font-bold ${flagClasses[user.status_flag] || ''}">${user.status_flag}</span></div>
                                </td>
                                <td class="text-sm text-gray-500">${new Date(user.created_at).toLocaleDateString()}</td>
                                <td><button data-user-id="${user.user_id}" data-user-name="${name || user.email}" class="delete-user-btn">Delete</button></td>
                            </tr>`
                        }).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch(e) {
             loadingUsersIndicator.style.display = 'none';
             usersContainer.innerHTML = `<p class="error-message">${e.message}</p>`;
        }
    };

    const fetchAndDisplayAdminApplicants = async (jobId, jobTitle) => {
        showView('applicants');
        const applicantsContainer = document.getElementById('admin-applicants-container');
        const loadingIndicator = document.getElementById('admin-loading-applicants-indicator');

        document.getElementById('admin-applicants-title').textContent = `Applicants for "${jobTitle}"`;

        loadingIndicator.style.display = 'block';
        applicantsContainer.innerHTML = '';

        try {
            const applicants = await apiFetch(`/api/jobs/${jobId}/applicants`);

            if (applicants.length === 0) {
                applicantsContainer.innerHTML = '<p style="text-align: center; color: #6b7280;">No applicants for this job.</p>';
            } else {
                applicantsContainer.innerHTML = applicants.map(app => `
                    <div class="list-item">
                        <div class="list-item-content">
                            <p class="font-semibold">${app.first_name} ${app.last_name}</p>
                            <p class="text-sm text-gray-600">${app.email}</p>
                            <p class="text-sm text-gray-500">Applied: ${new Date(app.application_date).toLocaleDateString()}</p>
                        </div>
                        <button data-resume-url="${app.resume_url}" class="view-resume-btn button green-button">View Resume</button>
                    </div>`).join('');
            }
        } catch(e) {
            applicantsContainer.innerHTML = `<p class="error-message">${e.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    document.getElementById('admin-create-job-btn').addEventListener('click', async () => {
        createJobForm.reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('admin-app-deadline').setAttribute('min', today);
        await fetchAllEmployers();
        createJobModal.classList.remove('hidden');
    });

    createJobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(createJobForm));
        try {
            const result = await apiFetch('/api/employer/jobs', { method: 'POST', body: JSON.stringify(data) });
            showToast(result.msg);
            createJobModal.classList.add('hidden');
            await fetchAllJobs(true);
        } catch(error) { document.getElementById('admin-create-job-error-msg').textContent = error.message; }
    });

    pendingJobsContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if(!target) return;
        const { jobId } = target.dataset;
        if(!jobId) return;
        try {
            let result;
            if(target.classList.contains('approve-btn')) {
                result = await apiFetch(`/api/admin/jobs/${jobId}/approve`, {method: 'PUT'});
            } else if (target.classList.contains('reject-btn')) {
                result = await apiFetch(`/api/admin/jobs/${jobId}/reject`, {method: 'PUT'});
            }
            if(result) {
                showToast(result.msg);
                document.getElementById(`pending-job-${jobId}`).remove();
                if(pendingJobsContainer.children.length === 0) {
                     pendingJobsContainer.innerHTML = '<p class="text-gray-500">No jobs are currently pending approval.</p>';
                }
                await fetchAllJobs(true);
            }
        } catch(error) { showToast(error.message); }
    });

    pendingAdminsContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if(!target) return;
        const { userId } = target.dataset;
        if(!userId) return;

        try {
            let result;
            if(target.classList.contains('approve-user-btn')) {
                result = await apiFetch(`/api/admin/users/${userId}/approve`, {method: 'PUT'});
            } else if (target.classList.contains('reject-user-btn')) {
                result = await apiFetch(`/api/admin/users/${userId}/reject`, {method: 'PUT'});
            }
            if(result) {
                showToast(result.msg);
                document.getElementById(`pending-user-${userId}`).remove();
                if(pendingAdminsContainer.children.length === 0) {
                    pendingAdminsContainer.innerHTML = '<p class="text-gray-500">No new admin requests.</p>';
                }
            }
        } catch(error) { showToast(error.message); }
    });

    allJobsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if(!target) return;
        if (target.classList.contains('delete-job-btn')) {
            const { jobId, jobTitle } = target.dataset;
            deleteJobConfirmText.textContent = `Do you really want to permanently delete the job post for "${jobTitle}"?`;
            deleteJobConfirmBtn.dataset.jobId = jobId;
            deleteJobModal.classList.remove('hidden');
        }
        if (target.classList.contains('admin-view-applicants-btn')) {
            const { jobId, jobTitle } = target.dataset;
            fetchAndDisplayAdminApplicants(jobId, jobTitle);
        }
    });

    loadMoreContainer.addEventListener('click', (e) => {
        if (e.target.id === 'load-more-btn') {
            fetchAllJobs();
        }
    });

    deleteJobConfirmBtn.addEventListener('click', async (e) => {
        const { jobId } = e.target.dataset;
        try {
            const result = await apiFetch(`/api/jobs/${jobId}`, {method: 'DELETE'});
            showToast(result.msg);
            deleteJobModal.classList.add('hidden');
            const el = document.getElementById(`all-job-${jobId}`);
            if (el) el.remove();
        } catch(error) { showToast(error.message); }
    });

    document.getElementById('view-users-btn').addEventListener('click', fetchAndDisplayUsers);
    document.getElementById('back-to-admin-dash-btn').addEventListener('click', () => showView('main'));
    document.getElementById('back-to-admin-jobs-btn').addEventListener('click', () => showView('main'));

    document.getElementById('admin-applicants-container').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if(target && target.classList.contains('view-resume-btn')) {
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

    usersContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (target && target.classList.contains('delete-user-btn')) {
            const { userId, userName } = target.dataset;
            deleteUserConfirmText.textContent = `Are you sure you want to delete the user: ${userName}? This will remove all their associated data.`;
            deleteUserConfirmBtn.dataset.userId = userId;
            deleteUserModal.classList.remove('hidden');
        }
    });

    deleteUserConfirmBtn.addEventListener('click', async (e) => {
        const { userId } = e.target.dataset;
        if (!userId) return;
        try {
            const result = await apiFetch(`/api/admin/users/${userId}`, {method: 'DELETE'});
            showToast(result.msg);
            document.getElementById(`user-row-${userId}`).remove();
        } catch(error) { showToast(error.message); }
        finally { deleteUserModal.classList.add('hidden'); }
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
