document.addEventListener('DOMContentLoaded', () => {
    const renderBtn = document.getElementById('render-btn');
    const jsonInput = document.getElementById('json-input');
    const timeAxis = document.getElementById('time-axis-content');
    const dayContents = document.querySelectorAll('.day-content');

    // Constants
    const START_HOUR = 9;
    const END_HOUR = 21;
    const HOUR_HEIGHT = 80; // Should match CSS --hour-height

    // Initial setup
    setupTimeAxis();

    const initialData = [
        {
            "이름": "사용자A",
            "color": "#ffe066",
            "수업": [
                { "이름": "전공과목1", "시간표": "월[DD]13:30-14:45,수[CC]12:00-13:15" },
                { "이름": "융합디자인", "시간표": "금[EE]15:00-16:15,금[FF]16:30-17:45" }
            ]
        },
        {
            "이름": "사용자B",
            "color": "#ffb8b8",
            "수업": [
                { "이름": "전공세미나", "시간표": "수[09]17:00-17:50" },
                { "이름": "인공지능기초", "시간표": "목[EE]15:00-16:15,목[FF]16:30-17:45" },
                { "이름": "기계학습", "시간표": "화[DD]13:30-14:45,목[CC]12:00-13:15" }
            ]
        },
        {
            "이름": "사용자C",
            "color": "#74b9ff",
            "수업": [
                { "이름": "딥러닝이론", "시간표": "화[EE]15:00-16:15,목[FF]16:30-17:45" },
                { "이름": "생성형AI", "시간표": "화[CC]12:00-13:15,목[DD]13:30-14:45" }
            ]
        }
    ];
    jsonInput.value = JSON.stringify(initialData, null, 2);

    renderBtn.addEventListener('click', () => {
        try {
            const data = JSON.parse(jsonInput.value);
            renderTimetable(data);
        } catch (e) {
            alert('JSON 파싱 오류가 발생했습니다.\n\n오류 내용:\n' + e.message);
        }
    });

    function setupTimeAxis() {
        timeAxis.innerHTML = '';
        const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
        timeAxis.style.height = `${totalHeight}px`;

        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            // Start hour is at top 0.
            timeLabel.style.top = `${(hour - START_HOUR) * HOUR_HEIGHT}px`;

            const periodNum = hour - 8; // 9:00 is 1교시
            timeLabel.innerHTML = `
                <div style="font-weight: 700; color: #495057;">${periodNum}교시</div>
                <div style="font-size: 11px; color: #adb5bd; margin-top: 2px;">${hour}:00</div>
            `;
            timeAxis.appendChild(timeLabel);
        }

        dayContents.forEach(content => {
            content.style.height = `${totalHeight}px`;
        });
    }

    function renderTimetable(users) {
        dayContents.forEach(dc => dc.innerHTML = '');
        let sessions = [];

        users.forEach(user => {
            user.수업.forEach(cls => {
                const times = parseTimes(cls.시간표);
                times.forEach(t => {
                    sessions.push({
                        userName: user.이름,
                        userColor: user.color || '#e0e0e0',
                        className: cls.이름,
                        day: t.day,
                        startMin: t.startMin,
                        endMin: t.endMin,
                        rawTime: t.rawTime
                    });
                });
            });
        });

        const days = { '월': [], '화': [], '수': [], '목': [], '금': [] };
        sessions.forEach(s => {
            if (days[s.day]) days[s.day].push(s);
        });

        // pixels per minute
        const PPM = HOUR_HEIGHT / 60;

        Object.keys(days).forEach(day => {
            const daySessions = days[day];
            if (daySessions.length === 0) return;

            // Group identically timed sessions to merge them
            const grouped = {};
            daySessions.forEach(s => {
                const key = `${s.startMin}-${s.endMin}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(s);
            });

            const mergedSessions = [];
            Object.values(grouped).forEach(group => {
                mergedSessions.push({
                    startMin: group[0].startMin,
                    endMin: group[0].endMin,
                    rawTime: group[0].rawTime,
                    items: group
                });
            });

            // Sort before checking overlaps
            mergedSessions.sort((a, b) => a.startMin - b.startMin);

            // Build columns within the day for sideways layout (partial overlaps)
            const columns = [];
            mergedSessions.forEach(ms => {
                let placed = false;
                for (let i = 0; i < columns.length; i++) {
                    const col = columns[i];
                    // Overlaps if max(a.start, b.start) < min(a.end, b.end)
                    const overlaps = col.some(c => Math.max(ms.startMin, c.startMin) < Math.min(ms.endMin, c.endMin));
                    if (!overlaps) {
                        col.push(ms);
                        ms.colIndex = i;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    ms.colIndex = columns.length;
                    columns.push([ms]);
                }
            });

            const dayContent = document.querySelector(`.day-column[data-day="${day}"] .day-content`);
            if (!dayContent) return;

            mergedSessions.forEach(ms => {
                const card = document.createElement('div');
                card.className = 'class-card';

                // Add left border element
                const borderDiv = document.createElement('div');
                borderDiv.className = 'class-card-inner-border';
                card.appendChild(borderDiv);

                // Position Y
                const topDiffMin = ms.startMin - (START_HOUR * 60);
                const heightMin = ms.endMin - ms.startMin;

                card.style.top = `${topDiffMin * PPM}px`;
                card.style.height = `${heightMin * PPM}px`;

                // Calculate width based on max ongoing overlaps
                let maxOverlaps = 1;
                mergedSessions.forEach(other => {
                    // Check local cluster
                    if (Math.max(ms.startMin, other.startMin) < Math.min(ms.endMin, other.endMin)) {
                        // A simple hack to get width: find the max column index of all items overlapping this one 
                        // and add 1. This isn't perfect graph coloring but sufficient.
                    }
                });

                // Better approach: filter columns if they have any item overlapping with THIS ms
                const overlappingColsCount = columns.filter(col =>
                    col.some(c => Math.max(ms.startMin, c.startMin) < Math.min(ms.endMin, c.endMin))
                ).length;

                const widthPercent = 100 / (overlappingColsCount || 1);
                card.style.width = `calc(${widthPercent}% - 4px)`; // slight gap
                card.style.left = `calc(${ms.colIndex * widthPercent}% + 2px)`;

                if (ms.items.length === 1) {
                    const item = ms.items[0];
                    card.style.backgroundColor = item.userColor;
                    card.innerHTML += `
                        <div class="class-title">${item.className}</div>
                        <div class="class-people">${item.userName}</div>
                        <div class="class-time">${ms.rawTime}</div>
                    `;
                } else {
                    // Merged Card setup - Build stripped diagonal gradient
                    const step = 100 / ms.items.length;
                    const stops = [];
                    // Using repeating colors evenly
                    ms.items.forEach((item, idx) => {
                        const next = idx + 1;
                        stops.push(`${item.userColor} ${idx * step}%`);
                        stops.push(`${item.userColor} ${next * step}%`);
                    });

                    card.style.background = `linear-gradient(135deg, ${stops.join(', ')})`;

                    // Distinct classes
                    const classNames = [...new Set(ms.items.map(i => i.className))].join('<br>');
                    // Distinct names
                    const userNames = ms.items.map(i => i.userName).join(' / ');

                    card.innerHTML += `
                        <div class="class-title">${classNames}</div>
                        <div class="class-people">${userNames}</div>
                        <div class="class-time">${ms.rawTime}</div>
                    `;
                    card.style.color = '#111'; // enforce dark text on multi color
                }

                dayContent.appendChild(card);
            });
        });
    }

    function parseTimes(rawString) {
        // e.g., "월[DD]13:30-14:45", "수[CC]12:00-13:15", "화15:00-16:15"
        const segments = rawString.split(',');
        const times = [];

        segments.forEach(seg => {
            const trimmed = seg.trim();
            if (!trimmed) return;

            // Match exactly: (Day)(optional bracket)(time)-(time)
            // ex: 월[DD]13:30-14:45
            // match[1] = 월
            // match[2] = 13:30
            // match[3] = 14:45
            const match = trimmed.match(/([월화수목금토일])(?:\[.*?\])?\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (match) {
                const day = match[1];
                const startStr = match[2];
                const endStr = match[3];

                const startMin = timeToMin(startStr);
                const endMin = timeToMin(endStr);

                times.push({
                    day,
                    startMin,
                    endMin,
                    rawTime: `${startStr}-${endStr}`
                });
            }
        });
        return times;
    }

    function timeToMin(timeStr) {
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    // Auto render on load
    setTimeout(() => renderBtn.click(), 100);
});
