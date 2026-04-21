/**
 * Charts Manager — Chart.js visualization layer
 * Manages all chart instances and rendering logic.
 */

// Chart.js global defaults
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17, 24, 39, 0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
Chart.defaults.animation.duration = 800;
Chart.defaults.animation.easing = 'easeOutQuart';

// Segment color palette fallback
const PALETTE = [
    '#10b981', '#06b6d4', '#7c3aed', '#3b82f6', '#8b5cf6',
    '#f59e0b', '#f97316', '#ef4444', '#dc2626', '#6b7280'
];

const Charts = {
    instances: {},

    /**
     * Safely destroy an existing chart instance.
     */
    destroy(id) {
        if (this.instances[id]) {
            this.instances[id].destroy();
            delete this.instances[id];
        }
    },

    /**
     * Create or recreate a chart.
     */
    create(id, config) {
        this.destroy(id);
        const canvas = document.getElementById(id);
        if (!canvas) return null;
        this.instances[id] = new Chart(canvas.getContext('2d'), config);
        return this.instances[id];
    },

    // ===================== ELBOW CHART =====================
    renderElbow(elbowData, optimalK) {
        const labels = elbowData.map(d => d.k);
        const inertias = elbowData.map(d => d.inertia);

        this.create('elbow-chart', {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Inertia',
                    data: inertias,
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 3,
                    pointRadius: labels.map(k => k === optimalK ? 8 : 4),
                    pointBackgroundColor: labels.map(k => k === optimalK ? '#f59e0b' : '#7c3aed'),
                    pointBorderColor: labels.map(k => k === optimalK ? '#fcd34d' : '#a78bfa'),
                    pointBorderWidth: labels.map(k => k === optimalK ? 3 : 1),
                    fill: true,
                    tension: 0.3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => `k = ${items[0].label}`,
                            label: (item) => {
                                const suffix = Number(item.label) === optimalK ? ' ← Optimal' : '';
                                return `Inertia: ${item.formattedValue}${suffix}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Number of Clusters (k)', color: '#64748b' },
                        grid: { display: false }
                    },
                    y: {
                        title: { display: true, text: 'Inertia (WCSS)', color: '#64748b' },
                        grid: { color: 'rgba(255,255,255,0.04)' }
                    }
                }
            }
        });
    },

    // ===================== SCATTER CHART =====================
    renderScatter(customers, profiles, xField, yField) {
        const colorMap = {};
        profiles.forEach(p => { colorMap[p.name] = p.color; });

        const datasets = profiles.map(p => ({
            label: p.name,
            data: customers
                .filter(c => c.Segment === p.name)
                .map(c => ({ x: c[xField], y: c[yField] })),
            backgroundColor: p.color + '99',
            borderColor: p.color,
            borderWidth: 1,
            pointRadius: 3.5,
            pointHoverRadius: 6,
        }));

        this.create('scatter-chart', {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${xField}=${ctx.parsed.x}, ${yField}=${ctx.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: xField, color: '#64748b' },
                        grid: { color: 'rgba(255,255,255,0.04)' }
                    },
                    y: {
                        title: { display: true, text: yField, color: '#64748b' },
                        grid: { color: 'rgba(255,255,255,0.04)' }
                    }
                }
            }
        });
    },

    // ===================== RADAR CHART =====================
    renderRadar(profiles) {
        // Normalize RFM values to 0-100 scale for radar
        const maxR = Math.max(...profiles.map(p => p.avg_recency)) || 1;
        const maxF = Math.max(...profiles.map(p => p.avg_frequency)) || 1;
        const maxM = Math.max(...profiles.map(p => p.avg_monetary)) || 1;

        const datasets = profiles.map(p => ({
            label: p.name,
            data: [
                Math.round((1 - p.avg_recency / maxR) * 100), // inverted: low recency = good
                Math.round((p.avg_frequency / maxF) * 100),
                Math.round((p.avg_monetary / maxM) * 100),
            ],
            borderColor: p.color,
            backgroundColor: p.color + '20',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: p.color,
        }));

        this.create('radar-chart', {
            type: 'radar',
            data: {
                labels: ['Recency Score', 'Frequency Score', 'Monetary Score'],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 } }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 25, backdropColor: 'transparent', color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        pointLabels: { color: '#94a3b8', font: { size: 12, weight: '500' } },
                        angleLines: { color: 'rgba(255,255,255,0.06)' }
                    }
                }
            }
        });
    },

    // ===================== AGE CHART =====================
    renderAge(demoData) {
        const segments = demoData.segments;
        const ageLabels = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

        const datasets = segments.map((seg, i) => ({
            label: seg,
            data: ageLabels.map(a => (demoData.age[seg] || {})[a] || 0),
            backgroundColor: PALETTE[i % PALETTE.length] + 'cc',
            borderColor: PALETTE[i % PALETTE.length],
            borderWidth: 1,
            borderRadius: 4,
        }));

        this.create('age-chart', {
            type: 'bar',
            data: { labels: ageLabels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10 } } }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Age Group', color: '#64748b' },
                        grid: { display: false }
                    },
                    y: {
                        title: { display: true, text: 'Count', color: '#64748b' },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true
                    }
                }
            }
        });
    },

    // ===================== GENDER CHART =====================
    renderGender(demoData) {
        const segments = demoData.segments;
        const genders = ['Male', 'Female'];

        const datasets = genders.map((g, i) => ({
            label: g,
            data: segments.map(seg => (demoData.gender[seg] || {})[g] || 0),
            backgroundColor: i === 0 ? '#3b82f6cc' : '#f43f5ecc',
            borderColor: i === 0 ? '#3b82f6' : '#f43f5e',
            borderWidth: 1,
            borderRadius: 4,
        }));

        this.create('gender-chart', {
            type: 'bar',
            data: { labels: segments, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 } } }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true
                    },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
    },

    // ===================== MEMBERSHIP CHART =====================
    renderMembership(demoData) {
        const segments = demoData.segments;
        const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
        const tierColors = ['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2'];

        const datasets = tiers.map((t, i) => ({
            label: t,
            data: segments.map(seg => (demoData.membership[seg] || {})[t] || 0),
            backgroundColor: tierColors[i] + 'cc',
            borderColor: tierColors[i],
            borderWidth: 1,
            borderRadius: 4,
        }));

        this.create('membership-chart', {
            type: 'bar',
            data: { labels: segments, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 } } }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true
                    }
                }
            }
        });
    },

    // ===================== CATEGORY CHART =====================
    renderCategories(patternData) {
        const segments = patternData.segments;
        // Get all unique categories
        const allCats = new Set();
        segments.forEach(seg => {
            Object.keys(patternData.categories[seg] || {}).forEach(c => allCats.add(c));
        });
        const categories = [...allCats].sort();

        const datasets = segments.map((seg, i) => ({
            label: seg,
            data: categories.map(c => (patternData.categories[seg] || {})[c] || 0),
            backgroundColor: PALETTE[i % PALETTE.length] + 'cc',
            borderColor: PALETTE[i % PALETTE.length],
            borderWidth: 1,
            borderRadius: 3,
        }));

        this.create('category-chart', {
            type: 'bar',
            data: { labels: categories, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10 } } }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, maxRotation: 45 }
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true,
                        title: { display: true, text: 'Transactions', color: '#64748b' }
                    }
                }
            }
        });
    },

    // ===================== PAYMENT METHOD CHART =====================
    renderPayments(patternData) {
        const segments = patternData.segments;
        const allMethods = new Set();
        segments.forEach(seg => {
            Object.keys(patternData.payment_methods[seg] || {}).forEach(m => allMethods.add(m));
        });
        const methods = [...allMethods].sort();

        const methodColors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6'];

        const datasets = methods.map((m, i) => ({
            label: m,
            data: segments.map(seg => (patternData.payment_methods[seg] || {})[m] || 0),
            backgroundColor: methodColors[i % methodColors.length] + 'cc',
            borderColor: methodColors[i % methodColors.length],
            borderWidth: 1,
            borderRadius: 3,
        }));

        this.create('payment-chart', {
            type: 'bar',
            data: { labels: segments, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10 } } }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true,
                        title: { display: true, text: 'Transactions', color: '#64748b' }
                    }
                }
            }
        });
    },
};
