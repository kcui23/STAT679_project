let data, news_data, original_news_data, combinedData;
let currentSentimentFilter = 'all';
let parseDate = d3.timeParse("%Y-%m-%d")
let bisectDate = d3.bisector(function (d) { return parseDate(d.date); }).left
let tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("pointer-events", "none")
d3.select("head").append("style").html(`
    .tooltip {
      background-color: #fff;
      background-image: repeating-linear-gradient(
        45deg,
        rgba(0, 0, 0, 0.1),
        rgba(0, 0, 0, 0.1) 10px,
        rgba(0, 0, 0, 0.2) 10px,
        rgba(0, 0, 0, 0.2) 20px
      );
      border: 1px solid #ddd;
      box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
      padding: 8px;
      pointer-events: none;
      position: absolute;
    }
  `);


let margin = { top: 30, right: 20, bottom: 110, left: 50 },
    margin2 = { top: 430, right: 20, bottom: 30, left: 50 },
    width = 1500 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom

let x = d3.scaleTime().range([0, width]),
    x2 = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    y2 = d3.scaleLinear().range([height2, 0])

let xAxis = d3.axisBottom(x),
    xAxis2 = d3.axisBottom(x2),
    yAxis = d3.axisLeft(y)

let bullishLine = d3.line()
    .curve(d3.curveBasis)
    .x(function (d) { return x(parseDate(d.date)) })
    .y(function (d) { return y(d.close - (-d.close / 40) * d.bullish) })

let bearishLine = d3.line()
    .curve(d3.curveBasis)
    .x(function (d) { return x(parseDate(d.date)) })
    .y(function (d) { return y(d.close - (d.close / 40) * d.bearish) })

let bullishArea = d3.area()
    .curve(d3.curveBasis)
    .x(function (d) { return x(parseDate(d.date)) })
    .y0(function (d) { return y(d.close - (-d.close / 40) * d.bullish) })
    .y1(function (d) { return y(d.close) })

let bearishArea = d3.area()
    .curve(d3.curveBasis)
    .x(function (d) { return x(parseDate(d.date)) })
    .y0(function (d) { return y(d.close) })
    .y1(function (d) { return y(d.close - (d.close / 40) * d.bearish) })

let line = d3.line()
    .curve(d3.curveBasis)
    .x(function (d) { return x(parseDate(d.date)) })
    .y(function (d) { return y(d.close) })

let area2 = d3.area()
    .x(function (d) { return x2(parseDate(d.date)) })
    .y0(height2)
    .y1(function (d) { return y2(d.close) })

let brush = d3.brushX()
    .extent([[0, 0], [width, height2]])
    .on("brush end", brushed)

let svg = d3.select("svg")
    .attrs({
        "width": width + margin.left + margin.right,
        "height": height + margin.top + margin.bottom
    })

svg.append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attrs({
        "width": width,
        "height": height
    })

let focus = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

let context = svg.append("g")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")")

function brushed(event) {
    if (event.sourceEvent && event.sourceEvent.type === "zoom") return
    let s = event.selection || x2.range()
    x.domain(s.map(x2.invert, x2))

    const timeRange = x.domain();
    const timeDifference = timeRange[1] - timeRange[0];
    const oneDay = 24 * 60 * 60 * 1000;
    const oneMonth = oneDay * 30;

    const xAxisFormat = timeDifference < oneMonth * 5 ? d3.timeFormat("%b %d") : d3.timeFormat("%Y %b");
    xAxis.tickFormat(xAxisFormat);

    let dataWithinBrush = combinedData.filter(d => {
        let date = parseDate(d.date);
        return date >= x.domain()[0] && date <= x.domain()[1];
    });

    y.domain([
        d3.min(dataWithinBrush, function (d) { return d.close - (d.close / 40) * d.bearish - (d.close / 15) }),
        d3.max(dataWithinBrush, function (d) { return d.close - (-(d.close / 40)) * d.bullish + (d.close / 15) })
    ])

    focus.select(".y.axis").call(yAxis);
    focus.select(".line").attr("d", line);
    focus.select(".bullishLine").attr("d", bullishLine);
    focus.select(".bearishLine").attr("d", bearishLine);
    focus.select(".bullishArea").attr("d", bullishArea);
    focus.select(".bearishArea").attr("d", bearishArea);
    focus.select(".x.axis").call(xAxis);

    let newsWithinBrush = news_data.filter(newsItem => {
        let newsDate = parseDate(newsItem.date);
        return newsDate >= x.domain()[0] && newsDate <= x.domain()[1];
    });
    original_news_data = newsWithinBrush;
    newsWithinBrush = newsWithinBrush.filter(d => { return currentSentimentFilter === 'all' || d.sentiment === currentSentimentFilter });
    displayNewsTitles(newsWithinBrush);
}

function add_axis() {
    focus.append("g")
        .attrs({
            "class": "x axis",
            "transform": "translate(0," + height + ")"
        })
        .call(xAxis.tickFormat(d3.timeFormat("%Y %b")))

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis)
}

function mousemove(event) {
    let x0 = x.invert(d3.pointer(event, this)[0]),
        i = bisectDate(combinedData, x0, 1),
        d0 = combinedData[i - 1],
        d1 = combinedData[i],
        d = x0 - parseDate(d0.date) > parseDate(d1.date) - x0 ? d1 : d0;

    let xPosition = x(parseDate(d.date)) + 100 + margin.left - tooltip.node().getBoundingClientRect().width / 2,
        yPosition = y(d.close) + y(d.bearish) * 0.1 + margin.top - tooltip.node().getBoundingClientRect().height - 10; // 10px above the data point

    tooltip.html("Date: " + d.date + "<br/>" +
        "Price (Close): " + d.close.toFixed(2) + "<br/>" +
        "<span style='color: #1666ba;'> Bullish: " + d.bullish + "</span> <br/>" +
        "Neutral: " + d.neutral + "<br/>" +
        "<span style='color: #e27589;'> Bearish: " + d.bearish + "</span>")
        .transition()
        .duration(100)
        .ease(d3.easeLinear)
        .style("left", xPosition + "px")
        .style("top", yPosition + "px")
        .style("opacity", 0.8)
        .style("z-index", "10")
}



function add_hover_info() {
    let mouseG = focus.append("g")
        .attr("class", "mouse-over-effects")
        .attr("id", "hover_info")

    mouseG.append("rect")
        .attrs({
            "width": width,
            "height": height,
            "fill": "none",
            "pointer-events": "all"
        })
        .on("mouseout", () => { tooltip.style("display", "none"); })
        .on("mouseover", () => { tooltip.style("display", "block"); })
        .on("mousemove", mousemove)
}

function add_brush() {
    context.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range())

    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2.ticks(d3.timeMonth))
}

function add_main_chart(data) {
    var gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("style", "stop-color: #1666ba; stop-opacity: 1");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("style", "stop-color: white; stop-opacity: 1");

    focus.append("path")
        .datum(data)
        .attrs({
            "class": "line",
            "d": line,
            "fill": "none",
            "stroke": "rgb(37, 93, 108)",
            "stroke-width": "3px",
            "clip-path": "url(#clip)"
        })

    context.append("path")
        .datum(data)
        .attrs({
            "class": "area",
            "d": area2,
            "fill": "url(#gradient)"
        })
}

function addSentimentLinesAndAreas(combinedData) {
    focus.append("path")
        .datum(combinedData)
        .attrs({
            "class": "bullishLine",
            "d": bullishLine,
            "stroke": "#1666ba",
            "fill": "none",
            "clip-path": "url(#clip)"
        })

    focus.append("path")
        .datum(combinedData)
        .attrs({
            "class": "bearishLine",
            "d": bearishLine,
            "stroke": "#ff8dc6",
            "fill": "none",
            "clip-path": "url(#clip)"
        })

    focus.append("path")
        .datum(combinedData)
        .attrs({
            "class": "bullishArea",
            "d": bullishArea,
            "fill": "#bedaf7",
            "opacity": 0.5,
            "clip-path": "url(#clip)"
        })

    focus.append("path")
        .datum(combinedData)
        .attrs({
            "class": "bearishArea",
            "d": bearishArea,
            "fill": "#ffcde6",
            "opacity": 0.5,
            "clip-path": "url(#clip)"
        })
}

function visualize(ini_data) {
    data = ini_data[0].map(function (d) {
        return {
            date: d.Date,
            close: parseFloat(d.Close)
        }
    })
    console.log("data", data)

    sentiment_data = ini_data[1].map(function (d) {
        return {
            date: d.time,
            // close: d.price,
            bullish: parseInt(d.Bullish, 10),
            bearish: parseInt(d.Bearish, 10),
            neutral: parseInt(d.Neutral, 10)
        }
    })
    console.log("sentiment_data", sentiment_data)

    news_data = ini_data[2].map(function (d) {
        return {
            date: d.time,
            title: d.title,
            sentiment: d.sentiment
        }
    })
    original_news_data = news_data;
    console.log("news_data", news_data)


    combinedData = data.map(d => {
        let sentiment = sentiment_data.find(sd => sd.date === d.date)
        return {
            ...d,
            bullish: sentiment ? sentiment.bullish : 0,
            bearish: sentiment ? sentiment.bearish : 0,
            neutral: sentiment ? sentiment.neutral : 0
        }
    })
    console.log(combinedData)

    x.domain(d3.extent(combinedData, function (d) { return parseDate(d.date) }))
    y.domain([0, d3.max(combinedData, function (d) { return d.close })])
    x2.domain(x.domain())
    y2.domain(y.domain())

    add_main_chart(combinedData)
    add_axis()
    addSentimentLinesAndAreas(combinedData)
    add_brush()
    add_hover_info()
    displayNewsTitles(news_data)
}

function clear() {
    d3.selectAll("text").remove()
    d3.selectAll("path").remove()
    d3.selectAll(".rect").remove()
    d3.selectAll(".brush").remove()
    d3.selectAll(".y.axis").remove()
    d3.selectAll(".x.axis").remove()
    d3.selectAll("#hover_info").remove()
    d3.select('#newsList .news-table').remove()
}

function add_title(title) {
    let company_name = {
        "aapl": "Apple",
        "nvda": "NVIDIA",
        "amzn": "Amazon",
        "msft": "Microsoft",
        "googl": "Google",
        "meta": "META",
        "tsla": "Tesla"
    }
    title = company_name[title]
    svg.append("text")
        .attrs({
            "x": 80,
            "y": (margin.top / 2 + 8),
            "text-anchor": "middle"
        })
        .style("font-size", "25px")
        .style("text-decoration", "underline")
        .text(title)
}

function displayNewsTitles(newsArray) {
    let newsListDiv = document.getElementById('newsList');
    newsListDiv.innerHTML = '';
    let table = document.createElement('table');
    table.className = 'news-table';

    let headerRow = document.createElement('tr');
    let titleHeader = document.createElement('th');
    titleHeader.textContent = 'News Title';
    headerRow.appendChild(titleHeader);

    let dateHeader = document.createElement('th');
    dateHeader.textContent = 'Date';
    headerRow.appendChild(dateHeader);

    let sentimentHeader = document.createElement('th');
    sentimentHeader.textContent = 'Sentiment';
    headerRow.appendChild(sentimentHeader);

    let existingFilter = document.getElementById('newsFilter');
    if (!existingFilter) {
        let filterHeader = document.createElement('th');
        let filterSelect = document.createElement('select');
        filterSelect.id = 'newsFilter';
        filterSelect.innerHTML = `
            <option value="all">All</option>
            <option value="Bullish">Bullish</option>
            <option value="Neutral">Neutral</option>
            <option value="Bearish">Bearish</option>
        `;
        filterSelect.value = currentSentimentFilter;
        filterSelect.onchange = function () { filterNews(this.value); };
        filterHeader.appendChild(filterSelect);
        headerRow.appendChild(filterHeader);
    }

    table.appendChild(headerRow);

    newsArray.forEach(newsItem => {
        let row = document.createElement('tr');
        row.className = 'news-item ' + newsItem.sentiment.toLowerCase();

        let titleCell = document.createElement('td');
        titleCell.textContent = newsItem.title;
        row.appendChild(titleCell);

        let dateCell = document.createElement('td');
        dateCell.textContent = newsItem.date;
        row.appendChild(dateCell);

        let sentimentCell = document.createElement('td');
        sentimentCell.textContent = newsItem.sentiment;
        row.appendChild(sentimentCell);

        table.appendChild(row);
    });

    newsListDiv.appendChild(table);
}

function filterNews(sentiment) {
    currentSentimentFilter = sentiment;

    let filteredNews;
    if (sentiment === "all") {
        filteredNews = original_news_data;
    } else {
        filteredNews = original_news_data.filter(newsItem => newsItem.sentiment === sentiment);
    }
    displayNewsTitles(filteredNews);

    let filterSelect = document.getElementById('newsFilter');
    filterSelect.value = sentiment;
}

d3.select("#companySelect")
    .on("change", function () {
        let selectedValue = d3.select(this).property("value");
        clear()

        news = "https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/data/news_" + selectedValue + ".csv"
        news_1d_data = "https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/data/news_" + selectedValue + "_1d_data.csv"
        news_time_close_sent = "https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/data/news_" + selectedValue + "_time_close_sent.csv"
        Promise.all([d3.csv(news_1d_data), d3.csv(news_time_close_sent), d3.csv(news)])
            .then(visualize)
        add_title(selectedValue)
    });


// Promise.all([d3.csv("https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/data/news_nvda_1d_data.csv"),
// d3.csv("https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/data/news_nvda_time_close_sent.csv")])
//     .then(visualize)
