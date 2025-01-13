// Initialize storage for plane states
const planeStates = [];

// List of keys we want to track
const KEYS_TO_TRACK = [
    'altitude',
    'altitudeTime',
    'category',
    'country',
    'dataSource',
    'flight',
    'flightTs',
    'icao',
    'icaoType',
    'icaoTypeCache',
    'military',
    'onGround',
    'position',
    'position_time',
    'prev_speed',
    'prev_time',
    'rotation',
    'typeDescription',
    'typeLong'
];

// Function to get current minute from slider
function getCurrentHourMin() {
    const handle = document.getElementById('replayTimeHint');
    if (handle) {
        return handle.innerText.slice(0, 13);
    }
    return null;
}

// Function to filter plane object to only include tracked keys
function filterPlaneData(planes) {
    const filteredPlanes = {};
    
    for (const [planeId, planeData] of Object.entries(planes)) {
        filteredPlanes[planeId] = {};
        for (const key of KEYS_TO_TRACK) {
            if (key in planeData) {
                filteredPlanes[planeId][key] = planeData[key];
            }
        }
    }
    
    return filteredPlanes;
}

let prevHourMin = null

// Function to check and store plane states
function trackPlaneStates() {
    // Get current planes state
    if (typeof g !== 'undefined' && g.planes) {
        const filteredPlanes = filterPlaneData(g.planes);
        const currentPlanesState = JSON.stringify(filteredPlanes);
        const hourMin = getCurrentHourMin();
        // Only store if state has changed
        if (hourMin !== prevHourMin) {
            
            planeStates.push({
                hourMin: hourMin,
                planes: JSON.parse(currentPlanesState)
            });
            prevHourMin = hourMin;
            // Log for debugging
            console.log(`State changed at hourminute ${hourMin}. Total states stored: ${planeStates.length}`);
        }
    }
}

// Set up observer for the slider handle
const sliderObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' || mutation.type === 'childList') {
            trackPlaneStates();
        }
    });
});

// Start observing the slider handle
const sliderHandle = document.getElementById('replayTimeHint');
if (sliderHandle) {
    sliderObserver.observe(sliderHandle, {
        characterData: true,
        childList: true,
        subtree: true
    });
}

// // Set up interval to check for plane state changes
// const checkInterval = setInterval(trackPlaneStates, 1000);

// Function to get stored states
function getStoredPlaneStates() {
    return planeStates;
}

// Function to clear stored states
function clearStoredPlaneStates() {
    planeStates.length = 0;
    console.log('Cleared all stored plane states');
}

// Function to stop tracking
function stopTracking() {
    clearInterval(checkInterval);
    sliderObserver.disconnect();
    console.log('Stopped tracking plane states');
}




// function downloadObject(obj, filename = 'data.json') {
//   const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   URL.revokeObjectURL(url);
// }

// // Use it
// downloadObject(planeStates, 'myfile.json');