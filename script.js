/*

Name      Rupesh Bhusare, Vaibhav Gupta
Roll No.      2203106   ,   2203134   

*/



// Global variables
let processes = [];
let queueAlgorithms = {};
let queueQuantums = {
    q1: 2,
    q2: 2,
    q3: 2,
    q4: 2
};

document.addEventListener('DOMContentLoaded', () => {
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`q${i}`).addEventListener('change', (e) => {
            if (e.target.value === 'RR') {
                const quantum = prompt(`Enter time quantum for Queue ${i}:`, "2");
                if (quantum !== null) {
                    queueQuantums[`q${i}`] = parseInt(quantum) || 2;
                }
            }
        });
    }
});

document.getElementById('clear-processes').addEventListener('click', () => {
    // Clearing processes array
    processes = [];
    // Updating table
    updateProcessTable();
});

document.getElementById("add-process").addEventListener("click", () => {
    const arrivalTime = parseInt(document.getElementById("arrival-time").value);
    const cpuBurst = parseInt(document.getElementById("cpu-burst").value);
    const priority = parseInt(document.getElementById("priority").value);

    const errorMessage = document.getElementById("error-message");
    errorMessage.textContent = "";

    if (isNaN(arrivalTime) || isNaN(cpuBurst) || isNaN(priority)) {
        errorMessage.textContent = "All fields are required and must be valid numbers.";
        return;
    }

    const process = {
        id: `P${processes.length + 1}`,
        arrivalTime,
        cpuBurst,
        priority,
        status: 'waiting'
    };

    processes.push(process);
    updateProcessTable();
});

document.getElementById("run-simulation").addEventListener("click", () => {
    queueAlgorithms = {
        q1: document.getElementById("q1").value,
        q2: document.getElementById("q2").value,
        q3: document.getElementById("q3").value,
        q4: document.getElementById("q4").value,
    };
    simulateMLFQ();
});

function updateProcessTable() {
    const tableBody = document.querySelector("#process-table tbody");
    tableBody.innerHTML = "";
    
    processes.forEach((process, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${process.id}</td>
            <td>${process.arrivalTime}</td>
            <td>${process.cpuBurst}</td>
            <td>${process.priority}</td>
            <td>
                <button class="remove-process" data-index="${index}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Adding event listeners for remove buttons
    document.querySelectorAll('.remove-process').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            processes.splice(index, 1);
            
            // Renumbering remaining processes
            processes.forEach((p, i) => {
                p.id = `P${i + 1}`;
            });
            
            updateProcessTable();
        });
    });
}

// Adding CSS for remove button
const style = document.createElement('style');
style.textContent = `
    .remove-process {
        background: var(--accent);
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
    }
    .remove-process:hover {
        background: #c0392b;
    }
`;
document.head.appendChild(style);

function simulateMLFQ() {
    const queueVisualization = document.getElementById("queue-visualization");
    const ganttChart = document.getElementById("gantt-chart");
    queueVisualization.innerHTML = "";
    ganttChart.innerHTML = "";

    let processQueues = [[], [], [], []];
    let time = 0;
    let gantt = [];
    let queueIntervals = [[], [], [], []];
    let queueStates = [];

    let processPool = [...processes]
        .sort((a, b) => a.arrivalTime - b.arrivalTime)
        .map(p => ({
            ...p,
            remainingBurst: p.cpuBurst,
            currentQueue: 0,
            status: 'waiting'
        }));

    function addInterval(queueIndex, startTime, endTime, processId) {
        queueIntervals[queueIndex].push({
            startTime,
            endTime,
            processes: [processId]
        });
    }

    function recordQueueState(currentTime, activeProcess) {
        queueStates.push({
            time: currentTime,
            activeProcess: activeProcess?.id || 'idle',
            queues: processQueues.map(queue => queue.map(p => ({
                id: p.id,
                remainingBurst: p.remainingBurst
            }))),
            completed: processes.filter(p =>
                !processQueues.some(q => q.some(qp => qp.id === p.id)) &&
                !processPool.some(pp => pp.id === p.id)
            ).map(p => p.id)
        });
    }

    while (processPool.length > 0 || processQueues.some(q => q.length > 0)) {
        // Adding newly arrived processes
        while (processPool.length > 0 && processPool[0].arrivalTime <= time) {
            const process = processPool.shift();
            const queueIndex = Math.min(3, Math.floor((process.priority - 1) / 1));
            processQueues[queueIndex].push(process);
        }

        let processed = false;
        for (let queueIndex = 0; queueIndex < 4; queueIndex++) {
            if (processQueues[queueIndex].length > 0) {
                const algorithm = queueAlgorithms[`q${queueIndex + 1}`];
                let quantum = queueQuantums[`q${queueIndex + 1}`];
                let process;

                switch (algorithm) {
                    case 'RR':
                        process = processQueues[queueIndex][0];
                        const currentQuantum = queueQuantums[`q${queueIndex + 1}`];
                        const executeTime = Math.min(currentQuantum, process.remainingBurst);

                        // Recording state before execution
                        recordQueueState(time, process.id);

                        addInterval(queueIndex, time, time + executeTime, process.id);
                        gantt.push(process.id);

                        process.remainingBurst -= executeTime;
                        time += executeTime;
                        processQueues[queueIndex].shift();

                        // Adding newly arrived processes
                        while (processPool.length > 0 && processPool[0].arrivalTime <= time) {
                            const newProcess = processPool.shift();
                            const targetQueueIndex = Math.min(3, newProcess.priority - 1);
                            processQueues[targetQueueIndex].push(newProcess);

                            // Recording state after new process arrival
                            recordQueueState(time, process.id);
                        }

                        // Handling remaining burst
                        if (process.remainingBurst > 0) {
                            const nextQueueIndex = Math.min(3, queueIndex + 1);
                            processQueues[nextQueueIndex].push(process);

                            // Recording state after queue transition
                            recordQueueState(time, process.id);
                        } else {
                            // Adding to completed processes
                            if (!queueStates[queueStates.length - 1].completed.includes(process.id)) {
                                queueStates[queueStates.length - 1].completed.push(process.id);
                            }
                        }

                        // Printing queue states for debugging
                        processQueues.forEach((queue, idx) => {
                            console.log(`Q${idx + 1} contents: [${queue.map(p => p.id).join(', ')}]`);
                        });

                        processed = true;
                        break;

                    case 'FCFS':
                        process = processQueues[queueIndex][0];
                        addInterval(queueIndex, time, time + process.remainingBurst, process.id);
                        gantt.push(process.id);
                        time += process.remainingBurst;
                        process.remainingBurst = 0;
                        processQueues[queueIndex].shift();
                        recordQueueState(time, process);
                        break;

                    case 'SJF':
                        processQueues[queueIndex].sort((a, b) => a.remainingBurst - b.remainingBurst);
                        process = processQueues[queueIndex][0];
                        addInterval(queueIndex, time, time + process.remainingBurst, process.id);
                        gantt.push(process.id);
                        time += process.remainingBurst;
                        process.remainingBurst = 0;
                        processQueues[queueIndex].shift();
                        recordQueueState(time, process);
                        break;

                    case 'SRTF':
                        processQueues[queueIndex].sort((a, b) => a.remainingBurst - b.remainingBurst);
                        process = processQueues[queueIndex][0];
                        const timeSlice = 1;
                        addInterval(queueIndex, time, time + timeSlice, process.id);
                        gantt.push(process.id);
                        process.remainingBurst -= timeSlice;
                        time += timeSlice;
                        processQueues[queueIndex].shift();
                        recordQueueState(time, process);
                        if (process.remainingBurst > 0) {
                            processQueues[queueIndex].push(process);
                        }
                        break;
                }
                processed = true;
                break;
            }
        }

        if (!processed) {
            time++;
            recordQueueState(time, null);
        }
    }

    // Creating queue state table
    const queueStateTable = `
        <table class="queue-state-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Queue 1</th>
                    <th>Queue 2</th>
                    <th>Queue 3</th>
                    <th>Queue 4</th>
                    <th>Completed</th>
                </tr>
            </thead>
            <tbody>
                ${queueStates.map(state => `
                    <tr>
                        <td class="time-cell">${state.time}</td>
                        
                        ${state.queues.map(queue => `
                            <td class="waiting-process">${queue.map(p =>
        `${p.id}(${p.remainingBurst})`).join(', ') || '-'
        }</td>
                        `).join('')}
                        <td class="completed-process">${state.completed.join(', ') || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const formattedIntervals = queueIntervals.map((intervals, queueIndex) =>
        intervals
            .filter(interval => interval.processes.length > 0)
            .map(interval =>
                `Q${queueIndex + 1}[${interval.startTime}->${interval.endTime}[${interval.processes.join(", ")}]]`
            )
            .join(" ")
    );

    queueVisualization.innerHTML = `
        <div class="intervals">
            <h4>Queue Intervals</h4>
            ${formattedIntervals.join(", ")}
        </div>
        <div class="gantt">
            <h4>Gantt Chart</h4>
            ${gantt.join(", ")}
        </div>
        <div class="queue-states">
            <h4>Queue States Over Time</h4>
            ${queueStateTable}
        </div>
    `;
}