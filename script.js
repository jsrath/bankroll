/* Set up app-wide variables
--------------------------------------------------- */
let baseCurrency = 'AUD';
let exchangeCurrency = 'AUD';
let data = [];
let exchangDate;

/* Set up times for API calls 
--------------------------------------------------- */
const timePeriods = {
  today: moment().format('YYYY-MM-DD'),

  oneMonth: moment()
    .subtract(1, 'months')
    .format('YYYY-MM-DD'),

  threeMonths: moment()
    .subtract(3, 'months')
    .format('YYYY-MM-DD'),

  sixMonths: moment()
    .subtract(6, 'months')
    .format('YYYY-MM-DD'),

  oneYear: moment()
    .subtract(1, 'year')
    .format('YYYY-MM-DD'),
};

/* Fetch historical rates for the chart
--------------------------------------------------- */
async function getHistoricalRates(event, timePeriod) {
  data = [];
  let today = timePeriods.today;
  event ? (timePeriod = timePeriods[event.target.id]) : (timePeriod = timePeriods.oneMonth);
  await fetch(
    `https://api.exchangeratesapi.io/history?start_at=${timePeriod}&end_at=${today}&base=${baseCurrency}&symbols=${exchangeCurrency}`,
  )
    .then(result => result.json())
    .then(result =>
      Object.keys(result.rates)
        .sort((first, second) => first.localeCompare(second))
        .map(key => {
          data.push({ date: moment.utc(key), rate: result.rates[key][exchangeCurrency] });
        }),
    );
  displayChart();
}

/* Set default date and default currency values
--------------------------------------------------- */
async function setDefaultDate(date) {
  exchangeDate = date;
  return (document.querySelector('#exchangeDate').value = date);
}

async function getCurrencies(url) {
  await fetch(url)
    .then(result => result.json())
    .then(result => sortCurrencies(result))
    .then(result => setOptions(result));
}

function sortCurrencies(data) {
  const base = [data.base];
  const currencies = Object.keys(data.rates);
  setDefaultDate(data.date);
  return base.concat(currencies).sort((first, second) => first.localeCompare(second));
}

function setOptions(currencies) {
  const currencySelectors = document.querySelectorAll('.currency');
  return currencies.map(currency =>
    currencySelectors.forEach(selector => (selector.innerHTML += `<option>${currency}</option>`)),
  );
}

/* Handle form submission
--------------------------------------------------- */
function convertCurrencies(event) {
  event.preventDefault();
  const formValues = [...event.target.elements].slice(0, 4).map(element => element.value);
  fetchConversion(formValues);
}

function fetchConversion(values) {
  const amount = values[0];

  fetch(
    `https://api.exchangeratesapi.io/history?start_at=${exchangeDate}&end_at=${exchangeDate}&base=${baseCurrency}&symbols=${exchangeCurrency}`,
  )
    .then(result => result.json())
    .then(result => result.rates[exchangeDate][exchangeCurrency])
    .then(result => displayExchange(result, amount));
}

/* Display the converted amount
--------------------------------------------------- */
function displayExchange(result, amount) {
  const finalAmount = Number((result * amount).toFixed(2)).toLocaleString();
  document.querySelector('.output').innerHTML = `<h1>${finalAmount}</h1>`;
  getHistoricalRates(event, oneMonth);
}

/* Draw and display the chart
--------------------------------------------------- */
function displayChart() {
  clientWidth = document.querySelector('body').getBoundingClientRect().width * 0.7;
  drawChart(clientWidth);
  setChartTitles();
  document.querySelector('.chart-container').classList.add('displayed');
  document.querySelector('.output').scrollIntoView();
}

function setChartTitles() {
  const baseTitle = document.querySelector('#base-currency-title');
  const exchangeTitle = document.querySelector('#exchange-currency-title');
  baseTitle.innerText = baseCurrency;
  exchangeTitle.innerText = exchangeCurrency;
  document.querySelector('.chart-title').classList.add('displayed');
}

function drawChart(clientWidth) {
  d3.select('.chart').html('');
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = clientWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  const x = d3.scaleTime().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  const formatNumber = d3.format(',.2f');
  const formatBillion = number => formatNumber(number).replace(/G/, 'B');

  const valueline = d3
    .line()
    .curve(d3.curveCardinal)
    .x(d => x(d.date))
    .y(d => y(d.rate));

  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip');

  const svg = d3
    .select('.chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  x.domain(d3.extent(data, d => d.date));
  y.domain(d3.extent(data, d => d.rate));

  svg
    .append('path')
    .data([data])
    .attr('class', 'line')
    .attr('d', valueline);

  svg
    .selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(d.date))
    .attr('cy', d => y(d.rate))
    .attr('r', 8)
    .on('mouseover', d =>
      tooltip.style('display', 'block').html(
        `<p><strong>${moment(d.date).format('DD MMM YY')}</strong></p>
      <p>${d.rate.toLocaleString()}</p>`,
      ),
    )
    .on('mousemove', () => tooltip.style('top', `${d3.event.pageY + 10}px`).style('left', `${d3.event.pageX + 20}px`))
    .on('mouseout', () => tooltip.style('display', 'none'));

  svg
    .append('g')
    .attr('class', 'axisWhite')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%d %b')));

  svg
    .append('g')
    .attr('class', 'axisWhite')
    .call(
      d3
        .axisLeft(y)
        .ticks(10)
        .tickFormat(formatBillion),
    );
}

/* Event listeners for form submit and time buttons
--------------------------------------------------- */
document.querySelector('.currency-form').addEventListener('submit', convertCurrencies);
document.querySelector('.buttons').addEventListener('click', getHistoricalRates);

getCurrencies('https://api.exchangeratesapi.io/latest');
setDefaultDate();

/* Event listeners for currency and changes 
--------------------------------------------------- */

const baseSelect = document.querySelector('#baseCurrency');
baseSelect.addEventListener('change', () => (baseCurrency = baseSelect.value));

const exchangeSelect = document.querySelector('#exchangeCurrency');
exchangeSelect.addEventListener('change', () => (exchangeCurrency = exchangeSelect.value));

const dateSelect = document.querySelector('#exchangeDate');
dateSelect.addEventListener('change', () => (exchangeDate = dateSelect.value));
