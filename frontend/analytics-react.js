(function () {
  'use strict';

  if (!window.React || !window.ReactDOM || !window.Chart) return;

  const { createElement, useEffect, useRef } = window.React;
  const roots = new Map();
  const charts = new Set();

  function theme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    return {
      text: dark ? '#B7C4D6' : '#627084',
      grid: dark ? 'rgba(183,196,214,.12)' : 'rgba(98,112,132,.13)',
      border: dark ? '#121C2A' : '#FFFFFF'
    };
  }

  function IntelligenceChart({ type, rows, onSelect }) {
    const canvasRef = useRef(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      const currentTheme = theme();
      const isTrend = type === 'trend';
      const dataRows = isTrend ? rows.slice(-12) : rows.slice(0, 6);
      const labels = isTrend
        ? dataRows.map(row => {
            const month = Number(String(row.month || '').split('-')[1]);
            return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1] || row.month;
          })
        : dataRows.map(row => row.crime_type);
      const values = dataRows.map(row => Number(row.count || 0));
      const colors = ['#1C2B4A','#2A7F7F','#D4872A','#B91C1C','#166534','#64748B'];

      const chart = new Chart(canvas, {
        type: isTrend ? 'bar' : 'doughnut',
        data: {
          labels,
          datasets: [{
            label: isTrend ? 'FIRs' : 'Cases',
            data: values,
            backgroundColor: isTrend
              ? values.map((_, index) => index === values.length - 1 ? '#D4872A' : '#2A7F7F')
              : colors,
            hoverBackgroundColor: isTrend ? '#F1A53A' : ['#2C426F','#38A7A2','#F0A43D','#D65A5A','#2D8B62','#8190A5'],
            borderColor: isTrend ? 'rgba(255,255,255,.55)' : currentTheme.border,
            borderWidth: isTrend ? 1 : 3,
            borderRadius: isTrend ? 7 : 0,
            borderSkipped: false,
            hoverOffset: isTrend ? 0 : 10,
            maxBarThickness: 34
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          onHover: (event, elements) => { event.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
          onClick: (_event, elements) => {
            if (elements.length && typeof onSelect === 'function') onSelect(dataRows[elements[0].index]);
          },
          animation: { duration: 650, easing: 'easeOutQuart', delay: context => context.dataIndex * 24 },
          plugins: {
            legend: isTrend ? { display: false } : {
              position: 'bottom',
              labels: { color: currentTheme.text, usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 12, font: { size: 10, weight: 600 } }
            },
            tooltip: {
              displayColors: !isTrend,
              padding: 12,
              cornerRadius: 6,
              backgroundColor: 'rgba(12,26,48,.97)',
              titleColor: '#F7B84B',
              bodyColor: '#F8FAFC',
              callbacks: isTrend ? { label: context => `${Number(context.raw || 0).toLocaleString()} FIRs registered` } : {}
            }
          },
          scales: isTrend ? {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: currentTheme.text, font: { size: 11, weight: 600 } } },
            y: { beginAtZero: true, grid: { color: currentTheme.grid }, border: { display: false }, ticks: { color: currentTheme.text, maxTicksLimit: 5 } }
          } : undefined,
          cutout: isTrend ? undefined : '68%',
          rotation: isTrend ? undefined : -70
        }
      });

      charts.add(chart);
      return () => {
        charts.delete(chart);
        chart.destroy();
      };
    }, [type, rows, onSelect]);

    return createElement('canvas', { ref: canvasRef, 'aria-label': type === 'trend' ? 'Monthly FIR trend analytics' : 'Crime type distribution analytics' });
  }

  function mount(hostId, type, rows, onSelect) {
    const host = document.getElementById(hostId);
    if (!host || !Array.isArray(rows) || !rows.length) return false;
    let root = roots.get(hostId);
    if (!root) {
      host.replaceChildren();
      root = ReactDOM.createRoot(host);
      roots.set(hostId, root);
    }
    root.render(createElement(IntelligenceChart, { type, rows, onSelect }));
    return true;
  }

  window.NammaAnalytics = {
    mountTrend: rows => mount('crime-bar-chart-host', 'trend', rows, window.openMonthlyCrimeIntelligence),
    mountDistribution: rows => mount('crime-donut-chart-host', 'distribution', rows, window.openCrimeTypeIntelligence),
    syncTheme: () => charts.forEach(chart => chart.update())
  };
})();
