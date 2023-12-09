let data, combinedData;
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
    let dataWithinBrush = combinedData.filter(d => {
        let date = parseDate(d.date);
        return date >= x.domain()[0] && date <= x.domain()[1];
    });

    y.domain([
        d3.min(dataWithinBrush, function (d) { return d.close - 10 * d.bullish - 20 }),
        d3.max(dataWithinBrush, function (d) { return d.close - (-10) * d.bearish + 20 })
    ])


    focus.select(".y.axis").call(yAxis);
    focus.select(".line").attr("d", line);
    focus.select(".bullishLine").attr("d", bullishLine);
    focus.select(".bearishLine").attr("d", bearishLine);
    focus.select(".bullishArea").attr("d", bullishArea);
    focus.select(".bearishArea").attr("d", bearishArea);
    focus.select(".x.axis").call(xAxis);
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
        "Price: " + d.close.toFixed(2) + "<br/>" +
        "<span style='color: darkgreen;'> Bullish: " + d.bullish + "</span> <br/>" +
        "Neutral: " + d.neutral + "<br/>" +
        "<span style='color: darkred;'> Bearish: " + d.bearish + "</span>")
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
            "clip-path": "url(#clip)"
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
    console.log(data)

    sentiment_data = ini_data[1].map(function (d) {
        return {
            date: d.time,
            // close: d.price,
            bullish: parseInt(d.Bullish, 10),
            bearish: parseInt(d.Bearish, 10),
            neutral: parseInt(d.Neutral, 10)
        }
    })
    console.log(sentiment_data)

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
}

function clear() {
    d3.selectAll("text").remove()
    d3.selectAll("path").remove()
    d3.selectAll(".rect").remove()
    d3.selectAll(".brush").remove()
    d3.selectAll(".y.axis").remove()
    d3.selectAll(".x.axis").remove()
    d3.selectAll("#hover_info").remove()
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

d3.select("#companySelect")
    .on("change", function () {
        let selectedValue = d3.select(this).property("value");
        clear()
        add_title(selectedValue)

        news_1d_data = "https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/data/news_" + selectedValue + "_1d_data.csv"
        news_time_close_sent = "https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/data/news_" + selectedValue + "_time_close_sent.csv"
        Promise.all([d3.csv(news_1d_data),
        d3.csv(news_time_close_sent)])
            .then(visualize)
    });


// Promise.all([d3.csv("https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/news_nvda_1d_data.csv"),
// d3.csv("https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone3/news/news_nvda_time_close_sent.csv")])
//     .then(visualize)
