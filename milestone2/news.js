let data, combinedData;
let parseDate = d3.timeParse("%Y-%m-%d")
let bisectDate = d3.bisector(function (d) { return parseDate(d.date); }).left
let tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

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
    .y(function (d) { return y(d.close - 10 * d.bullish) })

let bearishLine = d3.line()
    .curve(d3.curveBasis)
    .x(function (d) { return x(parseDate(d.date)) })
    .y(function (d) { return y(d.close - (-10) * d.bearish) })

let bullishArea = d3.area()
    .curve(d3.curveBasis)
    .x(function (d) { return x(parseDate(d.date)) })
    .y0(function (d) { return y(d.close - 10 * d.bullish) })
    .y1(function (d) { return y(d.close) })

let bearishArea = d3.area()
    .curve(d3.curveBasis)
    .x(function (d) { return x(parseDate(d.date)) })
    .y0(function (d) { return y(d.close) })
    .y1(function (d) { return y(d.close - (-10) * d.bearish) })

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
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)

svg.append("text")
    .attr("x", 80)
    .attr("y", margin.top / 2 + 8)
    .attr("text-anchor", "middle")
    .style("font-size", "25px")
    .style("text-decoration", "underline")
    .text("Nvidia");

svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height)

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
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
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

    tooltip.style("opacity", 1)
    tooltip.html("Date: " + d.date + "<br/>" +
        "Price: " + d.close + "<br/>" +
        "Bullish: " + d.bullish + "<br/>" +
        "Bearish: " + d.bearish + "<br/>" +
        "Neutral: " + d.neutral)
        .style("left", (event.pageX) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function add_hover_info() {
    let mouseG = focus.append("g")
        .attr("class", "mouse-over-effects")

    mouseG.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mouseout", () => { tooltip.style("display", "none"); })
        .on("mouseover", () => { tooltip.style("display", "block"); })
        .on("mousemove", mousemove)

    focus.selectAll(".bullishArea, .bearishArea")
        .on("mousemove", function (event) {
            console.log("Mouse over area");
        });
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
        .attr("class", "line")
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "rgb(37, 93, 108)")
        .attr("stroke-width", "3px")
        .attr("clip-path", "url(#clip)")

    context.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area2)
        .attr("clip-path", "url(#clip)")
}

function addSentimentLinesAndAreas(combinedData) {
    focus.append("path")
        .datum(combinedData)
        .attr("class", "bullishLine")
        .attr("d", bullishLine)
        .attr("stroke", "green")
        .attr("fill", "none")
        .attr("clip-path", "url(#clip)")


    focus.append("path")
        .datum(combinedData)
        .attr("class", "bearishLine")
        .attr("d", bearishLine)
        .attr("stroke", "red")
        .attr("fill", "none")
        .attr("clip-path", "url(#clip)")


    focus.append("path")
        .datum(combinedData)
        .attr("class", "bullishArea")
        .attr("d", bullishArea)
        .style("fill", "lightgreen")
        .attr("opacity", 0.5)
        .attr("clip-path", "url(#clip)")

    focus.append("path")
        .datum(combinedData)
        .attr("class", "bearishArea")
        .attr("d", bearishArea)
        .style("fill", "lightcoral")
        .attr("opacity", 0.5)
        .attr("clip-path", "url(#clip)")

}


function visualize(ini_data) {
    data = ini_data[0].map(function (d) {
        return {
            date: d.Date,
            close: d.Close
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

Promise.all([d3.csv("https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone2/news_nvda_1d_data.csv"),
d3.csv("https://raw.githubusercontent.com/kcui23/STAT679_project/main/milestone2/news_nvda_time_close_sent.csv")])
    .then(visualize)