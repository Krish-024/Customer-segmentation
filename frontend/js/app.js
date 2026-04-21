/**
 * App Controller — Main application logic
 * Coordinates data flow between API and Charts.
 */

(function () {
    'use strict';

    // ==================== STATE ====================
    const state = {
        dataLoaded: false,
        segmented: false,
        profiles: [],
        customers: [],
        filteredCustomers: [],
        currentPage: 1,
        pageSize: 25,
        sortColumn: null,
        sortDirection: 'asc',
    };

    // ==================== DOM REFS ====================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        welcomeSection: $('#welcome-section'),
        dashboardSection: $('#dashboard-section'),
        statusDot: $('.status-dot'),
        statusText: $('#status-text'),
        loadingOverlay: $('#loading-overlay'),
        loadingText: $('#loading-text'),
        uploadModal: $('#upload-modal'),
        toastContainer: $('#toast-container'),

        // Buttons
        btnGenerate: $('#btn-generate'),
        btnUpload: $('#btn-upload'),
        btnWelcomeGenerate: $('#btn-welcome-generate'),
        btnWelcomeUpload: $('#btn-welcome-upload'),
        btnModalClose: $('#modal-close'),
        btnSubmitUpload: $('#btn-submit-upload'),
        btnRunClustering: $('#btn-run-clustering'),

        // File inputs
        fileCust: $('#file-customers'),
        fileTx: $('#file-transactions'),
        dropCust: $('#drop-customers'),
        dropTx: $('#drop-transactions'),
        labelCust: $('#label-customers'),
        labelTx: $('#label-transactions'),

        // Controls
        kSlider: $('#k-slider'),
        kValue: $('#k-value'),
        optimalBadge: $('#optimal-badge'),

        // Scatter controls
        scatterX: $('#scatter-x'),
        scatterY: $('#scatter-y'),

        // Table
        tableSearch: $('#table-search'),
        tableFilter: $('#table-segment-filter'),
        customerTbody: $('#customer-tbody'),
        tableCount: $('#table-count'),
        pagination: $('#pagination'),

        // Panels
        segmentsPanel: $('#segments-panel'),
        chartsRow: $('#charts-row'),
        demographicsRow: $('#demographics-row'),
        patternsRow: $('#patterns-row'),
        tablePanel: $('#table-panel'),
        segmentCountBadge: $('#segment-count-badge'),
    };


    // ==================== UTILITIES ====================

    function showLoading(text = 'Processing...') {
        dom.loadingText.textContent = text;
        dom.loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        dom.loadingOverlay.style.display = 'none';
    }

    function toast(message, type = 'success') {
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = message;
        dom.toastContainer.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(60px)';
            setTimeout(() => el.remove(), 300);
        }, 4000);
    }

    function formatNumber(n) {
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toLocaleString('en-IN');
    }

    function formatCurrency(n) {
        return '₹' + formatNumber(Math.round(n));
    }

    function animateCounter(el, target, prefix = '', suffix = '') {
        const duration = 1200;
        const start = performance.now();
        const initial = 0;

        function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = Math.round(initial + (target - initial) * eased);

            if (prefix === '₹') {
                el.textContent = formatCurrency(current);
            } else {
                el.textContent = prefix + formatNumber(current) + suffix;
            }

            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    function setStatus(text, online = false) {
        dom.statusDot.className = 'status-dot ' + (online ? 'online' : 'offline');
        dom.statusText.textContent = text;
    }


    // ==================== VIEW SWITCHING ====================

    function showWelcome() {
        dom.welcomeSection.style.display = 'flex';
        dom.dashboardSection.style.display = 'none';
    }

    function showDashboard() {
        dom.welcomeSection.style.display = 'none';
        dom.dashboardSection.style.display = 'block';
    }


    // ==================== DATA ACTIONS ====================

    async function handleGenerate() {
        showLoading('Generating synthetic dataset...');
        try {
            const result = await Api.generateData();
            state.dataLoaded = true;
            setStatus(`${result.customers} customers, ${result.transactions} transactions`, true);
            toast(`Generated ${result.customers} customers and ${result.transactions} transactions`, 'success');
            showDashboard();
            await loadElbow();
        } catch (err) {
            toast('Failed to generate data: ' + err.message, 'error');
        } finally {
            hideLoading();
        }
    }

    function openUploadModal() {
        dom.uploadModal.style.display = 'flex';
    }

    function closeUploadModal() {
        dom.uploadModal.style.display = 'none';
    }

    async function handleUpload() {
        const custFile = dom.fileCust.files[0];
        const txFile = dom.fileTx.files[0];
        if (!custFile || !txFile) return;

        closeUploadModal();
        showLoading('Uploading and processing files...');
        try {
            const result = await Api.uploadData(custFile, txFile);
            state.dataLoaded = true;
            setStatus(`${result.customers} customers, ${result.transactions} transactions`, true);
            toast(`Uploaded ${result.customers} customers and ${result.transactions} transactions`, 'success');
            showDashboard();
            await loadElbow();
        } catch (err) {
            toast('Upload failed: ' + err.message, 'error');
        } finally {
            hideLoading();
        }
    }


    // ==================== ELBOW ====================

    async function loadElbow() {
        showLoading('Computing Elbow Method...');
        try {
            const data = await Api.getElbow();
            Charts.renderElbow(data.elbow, data.optimal_k);
            dom.kSlider.value = data.optimal_k;
            dom.kValue.textContent = data.optimal_k;
            dom.optimalBadge.textContent = `Optimal: k=${data.optimal_k}`;
            toast(`Elbow analysis complete — optimal k=${data.optimal_k}`, 'info');
        } catch (err) {
            toast('Elbow analysis failed: ' + err.message, 'error');
        } finally {
            hideLoading();
        }
    }


    // ==================== SEGMENTATION ====================

    async function handleClustering() {
        const k = parseInt(dom.kSlider.value);
        showLoading(`Running K-Means clustering with k=${k}...`);
        try {
            const result = await Api.runSegmentation(k);

            state.segmented = true;
            state.profiles = result.profiles;

            // Update KPIs
            updateKPIs(result);

            // Render segment cards
            renderSegmentCards(result.profiles);

            // Show all panels
            dom.segmentsPanel.style.display = 'block';
            dom.chartsRow.style.display = 'grid';
            dom.demographicsRow.style.display = 'grid';
            dom.patternsRow.style.display = 'grid';
            dom.tablePanel.style.display = 'block';
            dom.segmentCountBadge.textContent = `${result.profiles.length} segments`;

            // Load additional data
            await Promise.all([
                loadScatterAndRadar(result.profiles),
                loadDemographics(),
                loadPatterns(),
                loadCustomerTable(result.profiles),
            ]);

            toast(`Segmentation complete — ${result.profiles.length} segments identified`, 'success');
        } catch (err) {
            toast('Clustering failed: ' + err.message, 'error');
        } finally {
            hideLoading();
        }
    }


    // ==================== KPIs ====================

    function updateKPIs(result) {
        const kpiCustomers = $('#kpi-customers .kpi-value');
        const kpiRevenue = $('#kpi-revenue .kpi-value');
        const kpiAOV = $('#kpi-aov .kpi-value');
        const kpiSegments = $('#kpi-segments .kpi-value');
        const kpiRecency = $('#kpi-recency .kpi-value');

        animateCounter(kpiCustomers, result.total_customers);
        animateCounter(kpiRevenue, result.total_revenue, '₹');
        animateCounter(kpiAOV, result.avg_order_value, '₹');
        animateCounter(kpiSegments, result.profiles.length);
        animateCounter(kpiRecency, result.avg_recency, '', ' days');
    }


    // ==================== SEGMENT CARDS ====================

    function renderSegmentCards(profiles) {
        const grid = $('#segments-grid');
        grid.innerHTML = '';

        profiles.forEach((p, i) => {
            const card = document.createElement('div');
            card.className = 'segment-card';
            card.style.animationDelay = `${i * 0.08}s`;
            card.style.animation = 'fadeInUp 0.5s ease-out both';
            card.querySelector?.('::before')?.style;
            card.innerHTML = `
                <style>.segment-card:nth-child(${i + 1})::before { background: ${p.color}; }</style>
                <div class="segment-card-header">
                    <span class="segment-card-icon">${p.icon}</span>
                    <span class="segment-card-name" style="color:${p.color}">${p.name}</span>
                    <span class="segment-card-count">${p.count} (${p.percentage}%)</span>
                </div>
                <div class="segment-card-desc">${p.description}</div>
                <div class="segment-metrics">
                    <div class="segment-metric">
                        <div class="segment-metric-value">${Math.round(p.avg_recency)}</div>
                        <div class="segment-metric-label">Recency</div>
                    </div>
                    <div class="segment-metric">
                        <div class="segment-metric-value">${p.avg_frequency.toFixed(1)}</div>
                        <div class="segment-metric-label">Frequency</div>
                    </div>
                    <div class="segment-metric">
                        <div class="segment-metric-value">${formatCurrency(p.avg_monetary)}</div>
                        <div class="segment-metric-label">Monetary</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }


    // ==================== SCATTER + RADAR ====================

    async function loadScatterAndRadar(profiles) {
        try {
            const result = await Api.getCustomers();
            state.customers = result.customers;

            const xField = dom.scatterX.value;
            const yField = dom.scatterY.value;
            Charts.renderScatter(result.customers, profiles, xField, yField);
            Charts.renderRadar(profiles);
        } catch (err) {
            console.error('Scatter/Radar error:', err);
        }
    }


    // ==================== DEMOGRAPHICS ====================

    async function loadDemographics() {
        try {
            const result = await Api.getDemographics();
            Charts.renderAge(result.data);
            Charts.renderGender(result.data);
            Charts.renderMembership(result.data);
        } catch (err) {
            console.error('Demographics error:', err);
        }
    }


    // ==================== PURCHASE PATTERNS ====================

    async function loadPatterns() {
        try {
            const result = await Api.getPatterns();
            Charts.renderCategories(result.data);
            Charts.renderPayments(result.data);
        } catch (err) {
            console.error('Patterns error:', err);
        }
    }


    // ==================== CUSTOMER TABLE ====================

    async function loadCustomerTable(profiles) {
        try {
            if (state.customers.length === 0) {
                const result = await Api.getCustomers();
                state.customers = result.customers;
            }

            state.filteredCustomers = [...state.customers];
            state.currentPage = 1;

            // Populate segment filter dropdown
            dom.tableFilter.innerHTML = '<option value="">All Segments</option>';
            profiles.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = `${p.icon} ${p.name}`;
                dom.tableFilter.appendChild(opt);
            });

            renderTable();
        } catch (err) {
            console.error('Customer table error:', err);
        }
    }

    function filterCustomers() {
        const search = dom.tableSearch.value.toLowerCase().trim();
        const segFilter = dom.tableFilter.value;

        state.filteredCustomers = state.customers.filter(c => {
            const matchesSearch = !search ||
                c.Name.toLowerCase().includes(search) ||
                c.CustomerID.toLowerCase().includes(search) ||
                c.City.toLowerCase().includes(search);
            const matchesSegment = !segFilter || c.Segment === segFilter;
            return matchesSearch && matchesSegment;
        });

        state.currentPage = 1;
        renderTable();
    }

    function sortCustomers(column) {
        if (state.sortColumn === column) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortColumn = column;
            state.sortDirection = 'asc';
        }

        state.filteredCustomers.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return state.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return state.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Update sort indicators
        $$('#customer-table thead th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.sort === column) {
                th.classList.add(`sorted-${state.sortDirection}`);
            }
        });

        renderTable();
    }

    function renderTable() {
        const start = (state.currentPage - 1) * state.pageSize;
        const end = start + state.pageSize;
        const pageData = state.filteredCustomers.slice(start, end);

        dom.customerTbody.innerHTML = pageData.map(c => `
            <tr>
                <td>${c.CustomerID}</td>
                <td>${c.Name}</td>
                <td>${c.Age}</td>
                <td>${c.Gender}</td>
                <td>${c.City}</td>
                <td><span class="tier-badge tier-${c.MembershipTier}">${c.MembershipTier}</span></td>
                <td>${c.Recency} days</td>
                <td>${c.Frequency}</td>
                <td>${formatCurrency(c.Monetary)}</td>
                <td><span class="segment-tag" style="border:1px solid ${c.SegmentColor}40; color:${c.SegmentColor}">${c.Segment}</span></td>
            </tr>
        `).join('');

        dom.tableCount.textContent = `Showing ${start + 1}–${Math.min(end, state.filteredCustomers.length)} of ${state.filteredCustomers.length} customers`;

        renderPagination();
    }

    function renderPagination() {
        const totalPages = Math.ceil(state.filteredCustomers.length / state.pageSize);
        const maxButtons = 7;
        dom.pagination.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous
        const prev = document.createElement('button');
        prev.textContent = '‹';
        prev.disabled = state.currentPage === 1;
        prev.addEventListener('click', () => { state.currentPage--; renderTable(); });
        dom.pagination.appendChild(prev);

        // Page numbers
        let startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

        for (let p = startPage; p <= endPage; p++) {
            const btn = document.createElement('button');
            btn.textContent = p;
            if (p === state.currentPage) btn.className = 'active';
            btn.addEventListener('click', () => { state.currentPage = p; renderTable(); });
            dom.pagination.appendChild(btn);
        }

        // Next
        const next = document.createElement('button');
        next.textContent = '›';
        next.disabled = state.currentPage === totalPages;
        next.addEventListener('click', () => { state.currentPage++; renderTable(); });
        dom.pagination.appendChild(next);
    }


    // ==================== FILE INPUT HANDLING ====================

    function setupFileInputs() {
        // Customers file
        dom.dropCust.addEventListener('click', () => dom.fileCust.click());
        dom.fileCust.addEventListener('change', () => {
            if (dom.fileCust.files[0]) {
                dom.labelCust.textContent = dom.fileCust.files[0].name;
                dom.dropCust.classList.add('has-file');
            }
            checkUploadReady();
        });

        // Transactions file
        dom.dropTx.addEventListener('click', () => dom.fileTx.click());
        dom.fileTx.addEventListener('change', () => {
            if (dom.fileTx.files[0]) {
                dom.labelTx.textContent = dom.fileTx.files[0].name;
                dom.dropTx.classList.add('has-file');
            }
            checkUploadReady();
        });

        // Drag & drop
        [dom.dropCust, dom.dropTx].forEach(drop => {
            drop.addEventListener('dragover', (e) => {
                e.preventDefault();
                drop.style.borderColor = '#7c3aed';
            });
            drop.addEventListener('dragleave', () => {
                drop.style.borderColor = '';
            });
        });

        dom.dropCust.addEventListener('drop', (e) => {
            e.preventDefault();
            dom.dropCust.style.borderColor = '';
            if (e.dataTransfer.files[0]) {
                dom.fileCust.files = e.dataTransfer.files;
                dom.labelCust.textContent = e.dataTransfer.files[0].name;
                dom.dropCust.classList.add('has-file');
                checkUploadReady();
            }
        });

        dom.dropTx.addEventListener('drop', (e) => {
            e.preventDefault();
            dom.dropTx.style.borderColor = '';
            if (e.dataTransfer.files[0]) {
                dom.fileTx.files = e.dataTransfer.files;
                dom.labelTx.textContent = e.dataTransfer.files[0].name;
                dom.dropTx.classList.add('has-file');
                checkUploadReady();
            }
        });
    }

    function checkUploadReady() {
        dom.btnSubmitUpload.disabled = !(dom.fileCust.files[0] && dom.fileTx.files[0]);
    }


    // ==================== EVENT BINDINGS ====================

    function bindEvents() {
        // Generate buttons
        dom.btnGenerate.addEventListener('click', handleGenerate);
        dom.btnWelcomeGenerate.addEventListener('click', handleGenerate);

        // Upload buttons
        dom.btnUpload.addEventListener('click', openUploadModal);
        dom.btnWelcomeUpload.addEventListener('click', openUploadModal);
        dom.btnModalClose.addEventListener('click', closeUploadModal);
        dom.btnSubmitUpload.addEventListener('click', handleUpload);
        dom.uploadModal.addEventListener('click', (e) => {
            if (e.target === dom.uploadModal) closeUploadModal();
        });

        // K slider
        dom.kSlider.addEventListener('input', () => {
            dom.kValue.textContent = dom.kSlider.value;
        });

        // Run clustering
        dom.btnRunClustering.addEventListener('click', handleClustering);

        // Scatter axis change
        dom.scatterX.addEventListener('change', () => {
            if (state.customers.length > 0 && state.profiles.length > 0) {
                Charts.renderScatter(state.customers, state.profiles, dom.scatterX.value, dom.scatterY.value);
            }
        });
        dom.scatterY.addEventListener('change', () => {
            if (state.customers.length > 0 && state.profiles.length > 0) {
                Charts.renderScatter(state.customers, state.profiles, dom.scatterX.value, dom.scatterY.value);
            }
        });

        // Table search and filter
        dom.tableSearch.addEventListener('input', filterCustomers);
        dom.tableFilter.addEventListener('change', filterCustomers);

        // Table column sort
        $$('#customer-table thead th[data-sort]').forEach(th => {
            th.addEventListener('click', () => sortCustomers(th.dataset.sort));
        });

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeUploadModal();
        });
    }


    // ==================== INIT ====================

    function init() {
        setupFileInputs();
        bindEvents();
        showWelcome();
    }

    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
