const { DeckGL, HeatmapLayer, TripsLayer, PathLayer } = deck;

const DATA_URL = './combined_satellite.csv';
const FLIGHTS_DATA_URL = './flights_v3.json';
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

let data = [];
let uniqueTimes = [];
let currentHour = 0;
let globPrevUniqueTime = null;
let globalNextUniqueTime = null;


const colors = {
  'Helicopter': [192, 57, 43],
  'Military Aircraft': [22, 160, 133],
  'Firefighting Aircraft': [41, 128, 185],
  'Cargo Aircraft': [241, 196, 15],
  'Other': [142, 68, 173],
}

async function loadData() {

  data = await d3.csv(DATA_URL, d => ({
    position: [+d.longitude, +d.latitude],
    temperature: +d.temp_c,
    time: new Date(d.dt_nearest_hour)
  }));

  flightsData = await d3.json(FLIGHTS_DATA_URL);
  // console.log(data);
  console.log(flightsData.length, "flightsData length");

  mappingData = await d3.json('./mapping.json');
  shapesData = await d3.json('./shapes.json');


  // const flightsLayer = new PathLayer({
  let flightsLayer = new TripsLayer({
    id: 'trip-layer',
    data: flightsData,
    getPath: d => d.coordinates,
    getTimestamps: d => d.time,
    // getColor: d => [Math.random() * 255, Math.random() * 255, Math.random() * 255],
    getColor: d => colors[d.aircraft_type],
    widthMinPixels: 3,
    rounded: true,
    trailLength: 800,
    capRounded: true,
    jointRounded: true,
    currentTime: 1736467140
  });

  let heatmapLayer = new HeatmapLayer({
    id: 'heatmap-layer',
    data: data,
    getPosition: d => d.position,
    getWeight: d => d.temperature,
    radiusPixels: 30
  });

  const deckgl = new DeckGL({
    container: 'deck-canvas',
    initialViewState: {
      longitude: -118.2437,
      latitude: 34.0522,
      zoom: 10,
      pitch: 0,
      bearing: 0
    },
    controller: true,
    mapStyle: MAP_STYLE,
    layers: [flightsLayer],
    getTooltip: ({object}) => updateTooltip(object)
  });

  uniqueTimes = [...new Set(data.map(d => d.time.getTime()))].sort((a, b) => a - b);

  // console.log(uniqueTimes);
  const options = {
    // month: 'short',
    // day: 'numeric',
    hour: 'numeric',
    hour12: true,
    timeZone: 'UTC'
  };

  const getLabels = (time) => {
    res = new Date(time)
    hour = res.getUTCHours();
    min = res.getUTCMinutes();
    // console.log(time, hour, min)
    if (min == 0) {
      if (hour < 12){
        return hour + "am";
      }
      return (hour - 12) + 'pm'
    }
    return null;
  }
  $('.ui.slider')
  .slider({
      restrictedLabels: uniqueTimes.map(time => getLabels(time)),
      min: Math.min(...uniqueTimes),
      max: Math.max(...uniqueTimes) + 60000 * 60,
      step: 60000,
      autoAdjustLabels: false,
      interpretLabel: function(value) {
        return getLabels(Math.min(...uniqueTimes) + value * 60000);
      },
      showLabelTicks: true,
      onChange: (value) => valueChanger(value),
      onMove: (value) => valueChanger(value),
  });

  const valueChanger = (value) => {
    const nextUniqueTime = uniqueTimes.find(time => time > value);
        const prevUniqueTime = uniqueTimes.findLast(time => time < value);

        if (globPrevUniqueTime != prevUniqueTime || globalNextUniqueTime != nextUniqueTime) {
          globPrevUniqueTime = prevUniqueTime;
          globalNextUniqueTime = nextUniqueTime;
          const filteredData = data.filter(d => {
            const time = d.time.getTime();
            if (prevUniqueTime === undefined) {
              return time < nextUniqueTime;
            }
            if (nextUniqueTime === undefined) {
              return time >= prevUniqueTime;
            }
            return time >= prevUniqueTime && time < nextUniqueTime;
          });
  
          // console.log(filteredData.length, value, nextUniqueTime, prevUniqueTime);
  
          heatmapLayer = new HeatmapLayer({
            id: 'heatmap-layer',
            data: filteredData,
            getPosition: d => d.position,
            // getWeight: d => d.temperature,
            radiusPixels: 50
          });
        }
        flightsLayer = new TripsLayer({
          id: 'trip-layer',
          data: flightsData,
          getPath: d => d.coordinates,
          getTimestamps: d => d.time,
          // getColor: d => [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          getColor: d => colors[d.aircraft_type],
          widthMinPixels: 3,
          rounded: true,
          trailLength: 400,
          capRounded: true,
          jointRounded: true,
          currentTime: value/1e3,
          pickable: true
        });
        deckgl.setProps({layers: [heatmapLayer, flightsLayer]});
  }

  const createSvgFromShape = (shape) => {
    return `<svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="${shape.viewBox}"
    width="${shape.w}"
    height="${shape.h}"
    style="display: inline-block; vertical-align: middle; transform: scale(2)"
  >
    <path
      d="${shape.path}"
      fill="currentColor"
      stroke="currentColor"
      stroke-width="${shape.strokeScale}"
    />
  </svg>`
  };

  const updateTooltip = (object) => {
    if (!object) return null;
    mapping = mappingData[object.icaoType] || mappingData[object.typeDescription];
    if (mapping){
      shape = shapesData[mapping[0]];
      svg = createSvgFromShape(shape);

    }
    else{
      svg = ''
    }
    return {
      html: `
        <div class="tooltip-content">
        <div style="text-align: center; padding: 10px transform: scale(3)">${svg} </div>
        <h3 class="tooltip-title">${object.typeLong}</h2>
          <div class="tooltip-section">
            <hr>
            <p><strong>ICAO:</strong> ${object.icao}</p>
            <p><strong>Type:</strong> ${object.aircraft_type} (${object.icaoType})</p>
            <p><strong>Category:</strong> ${object.typeDescription}</p>
          </div>
        </div>
      `,
      style: {
        backgroundColor: '#eee',
        color: '#000',
        fontSize: '0.9em',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '300px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }
    };
  };
  
  // set first value change
  $('.ui.slider').slider('set value', uniqueTimes[1], true);
  $('.ui.slider').slider('set value', uniqueTimes[0], true);


  // setInterval(() => {
  //   const sliderValue = $('.ui.slider').slider('get value');
  //   const nextValue = sliderValue + 30000;
  //   // console.log(nextValue)
  //   if (nextValue > Math.max(...uniqueTimes) + 60000) {
  //     $('.ui.slider').slider('set value', Math.min(...uniqueTimes), true);
  //   } else {
  //     $('.ui.slider').slider('set value', nextValue, true);
  //   }
  // }, 10);

  let isAnimating = true; // State to track animation status
let animationFrameId; // Store the requestAnimationFrame ID

function updateSlider() {
  if (!isAnimating) return; // Stop the animation if paused

  const sliderValue = $('.ui.slider').slider('get value');
  $('#main-time').text(new Date(sliderValue).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'UTC'
  }) + " UTC");
  const nextValue = sliderValue + 30000;

  if (nextValue > Math.max(...uniqueTimes) + 60000 * 60) {
    $('.ui.slider').slider('set value', Math.min(...uniqueTimes), true);
  } else {
    $('.ui.slider').slider('set value', nextValue, true);
  }

  // Continue the animation
  animationFrameId = requestAnimationFrame(updateSlider);
}

// Start the animation
requestAnimationFrame(updateSlider);

document.getElementById('toggle-animation').addEventListener('click', function () {
  if (isAnimating) {
    isAnimating = false;
    cancelAnimationFrame(animationFrameId); // Stop the current animation frame
    this.innerHTML = '<i class="play icon"></i> Resume'; // Update icon and text
  } else {
    isAnimating = true;
    this.innerHTML = '<i class="pause icon"></i> Pause'; // Update icon and text
    requestAnimationFrame(updateSlider); // Restart the animation
  }
});
  
}


loadData();