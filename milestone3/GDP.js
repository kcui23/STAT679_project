function nest(data) {
    let result = {};
    let countries = [...new Set(data.map(d => d.Country_Name))];
    for (let i = 0; i < countries.length; i++) {
        result[countries[i]] = [];
    }

    for (let i = 0; i < data.length; i++) {
        result[data[i].Country_Name].push(data[i]);
    }
    return Object.values(result);
}

function make_scales(data, margin) {
    return {
        x: d3.scaleLog()
            .domain([2000, 2022])
            .range([margin.left, 1000 - margin.right]),
        y: d3.scaleLinear()
            .domain(d3.extent(data.map(d => d.GDP)))
            .range([200 - margin.bottom, margin.top])
    };
}

function draw_lines(nested, scales) {
    let path_generator = d3.line()
        .x(d => scales.x(d.Year))
        .y(d => scales.y(d.GDP));
    d3.select("#lines")
        .selectAll("path")
        .data(nested).enter()
        .append("path")
        .attrs({
            d: path_generator,
            class: d => `line ${d[0].Country_Name.replace(/\s/g, "_")}` // Add a class based on country name
        })
        .on("mouseover", function (event, d) {
            mouseover(d);
        })
        .on("mouseout", function () {
            mouseout();
        });
}

function draw_axes(scales, margin) {
    let x_axis = d3.axisBottom(scales.x).tickFormat(d3.format("d"));
    d3.select("#x_axis")
        .attr("transform", `translate(0, ${200 - margin.bottom})`)
        .call(x_axis);

    let y_axis = d3.axisLeft(scales.y).tickFormat(d3.format(".2s"));
    d3.select("#y_axis")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(y_axis);
}

function visualize(data) {
    let margin = { top: 10, right: 10, bottom: 20, left: 50 };
    let nested = nest(data);
    let scales = make_scales(data, margin);
    draw_lines(nested, scales);
    draw_axes(scales, margin);
}

function mouseover(d) {
    // Update stroke width and color of the map path
    d3.select("#map")
        .selectAll("path")
        .attr("stroke-width", e => e.properties.Country_Name === d.properties.Country_Name ? 2 : 1)
        .attr("stroke", e => e.properties.Country_Name === d.properties.Country_Name ? "#ff0000" : "#b8a2a2");

    // Highlight the corresponding line
    d3.select(`.line.${d.properties.Country_Name.replace(/\s/g, "_")}`)
        .classed("highlighted", true);

    // Display the country name
    d3.select("#name")
        .select("text")
        .text(d.properties.Country_Name);
}

function mouseout() {
    d3.select("#map")
        .selectAll("path")
        .attr("stroke-width", 1)
        .attr("stroke", "#b8a2a2");

    // Remove highlight from all lines
    d3.selectAll(".line")
        .classed("highlighted", false);

    d3.select("#name")
        .select("text")
        .text("hover a country");
}


function visualize_map(data) {
    let width = 960,
        height = 540;

    let proj = d3.geoMercator()
        .fitSize([width, height], data);

    let path = d3.geoPath()
        .projection(proj);
        
    let filteredFeatures = data.features.filter(feature => {
        return feature.properties.ADMIN !== "Antarctica";
    });

    let colorScale = d3.scaleQuantile()
        .domain(filteredFeatures.map(d => d.properties.GDP_Per_Capita))
        .range(d3.schemeGreens[8]);

    let legend = d3.select("#legend");

    legend.selectAll("rect")
        .data(colorScale.range())
        .enter().append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("x", (_, i) => i * 25)
        .attr("fill", d => d);

    let format = d3.format(".2s");

    legend.selectAll("text")
        .data(colorScale.quantiles())
        .enter().append("text")
        .attr("x", (_, i) => i * 25)
        .attr("y", 35)
        .text(d => format(d))
        .attr("dy", "0.35em");

    legend.append("text")
        .attr("x", 0)
        .attr("y", 70)
        .text("GDP per Capita")
        .style("font-size", "12px");

    d3.select("#map")
        .selectAll("path")
        .data(filteredFeatures).enter()
        .append("path")
        .attrs({
            d: path,
            "stroke-width": 0,
            fill: d => colorScale(d.properties.GDP_Per_Capita)
        })
        .on("mouseover", (_, d) => mouseover(d))
        .on("mouseout", mouseout);

    d3.select("#name")
        .append("text")
        .attr("transform", "translate(50, 300)")
        .text("hover a country");
}



Promise.all([
    d3.csv("countries.csv", d3.autoType),
    d3.json("countries_map_all.geojson", d3.autoType)
])
    .then(([csvData, geojsonData]) => {
        visualize(csvData);
        visualize_map(geojsonData);
    });
