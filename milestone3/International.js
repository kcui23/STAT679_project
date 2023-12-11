function graph_order(data) {
  let graph = reorder.graph()
    .nodes(data["nodes"])
    .links(data["links"])
    .init();

  return reorder.spectral_order(graph)
}

function make_scales(order) {
  return {
    x: d3.scaleBand()
      .domain(order)
      .range([margins.left, 600]),
    y: d3.scaleBand()
      .domain(order)
      .range([0, 600 - margins.bottom]),
    fill: d3.scaleOrdinal()
      .domain(d3.range(10))
      .range(d3.schemeCategory10)
  }
}

function neighborhoods(nodes, links) {
  let result = {};
  for (let i = 0; i < nodes.length; i++) {
    result[nodes[i].index] = [nodes[i].index]
  }

  for (let i = 0; i < links.length; i++) {
    if (result[links[i].source.index]) {
      result[links[i].source.index].push(links[i].target.index)
    }
    if (result[links[i].target.index]) {
      result[links[i].target.index].push(links[i].source.index)
    }
  }

  return result
}

function tile_hover(e, d) {
  let [source, target, _] = d

  d3.select("#tiles")
    .selectAll("rect")
    .attr("stroke-width", d => (d[0] == source || d[1] == target) ? 2 : 0)

  d3.select("#xlabels")
    .selectAll("text")
    .attrs({
      "font-size": d => d.index == target? 14 : 10,
      "opacity": d => neighbors[source].indexOf(d.index) == -1? 0 : 1
    })

  d3.select("#ylabels")
    .selectAll("text")
    .attrs({
      "font-size": d => d.index == source? 14 : 10,
      "opacity": d => neighbors[target].indexOf(d.index) == -1? 0 : 1
    })
    
  d3.select("#name")
    .select("text")
    .text(d[3]+' to '+d[4]+': '+d[2]);
    
  d3.select("#map")
    .selectAll("line")
    .attr("stroke", d => (d[0] == source) ? ((d[1] == target) ? "red" : "blue") : "none")
    .attr("stroke-width", d => (d[0] == source && d[1] == target) ? 2 : 1)
}

function reset() {
  let defaults = {"font-size": 8, "opacity": 1}
  d3.selectAll("#xlabels")
    .selectAll("text")
    .attrs(defaults)

  d3.selectAll("#ylabels")
    .selectAll("text")
    .attrs(defaults)
  
  d3.select("#tiles")
    .selectAll("rect")
    .attr("stroke-width", 0)
    
  d3.select("#name")
    .select("text")
    .text("hover a tile")  

  d3.select("#map")
    .selectAll("line")
    .attr("stroke", "none")
}

function draw_matrix(matrix, scales) {
  d3.select("#tiles")
    .selectAll("rect")
    .data(matrix).enter()
    .append("rect")
    .attrs({
      x: d => scales.x(d[0]),
      y: d => scales.y(d[1]) - scales.y.bandwidth(),
      width: scales.x.bandwidth(),
      height: scales.y.bandwidth(),
      fill: d => scales.fill(d[2])
    })
    .on("mouseover", (e, d) => tile_hover(e, d))
  
  d3.select("#name")
    .append("text")
    .attr("transform", "translate(50, 330)")
    .text("hover a tile")
}

function draw_labels(nodes, scales) {
  d3.select("#ylabels")
    .selectAll("text")
    .data(nodes).enter()
    .append("text")
    .attrs({
      "font-size": 1,
      fill: d => scales.fill(d.group),
      transform: d => `translate(${scales.x(d.index) + 9}, ${600 - margins.bottom + 3})rotate(270)`
    }).text(d => d.name)

  d3.select("#xlabels")
    .selectAll("text")
    .data(nodes).enter()
    .append("text")
    .attrs({
      "font-size": 1,
      fill: d => scales.fill(d.group),
      transform: d => `translate(${margins.left},${scales.y(d.index)})`
    }).text(d => d.name)
}

function visualize(data_1,data,csvData) {
  let matrix = data_1["links"]
      .flatMap(({source, target, value, name_source, name_target}) => [
        [source, target, value, name_source, name_target]
      ]);
  let order = graph_order(data_1)
  let scales = make_scales(order)
  neighbors = neighborhoods(data_1["nodes"], data_1["links"]);
  
  let filteredFeatures = data.features.filter(feature => {
        return feature.properties.ADMIN !== "Antarctica";
    });
    let centroids = {};
    filteredFeatures.forEach(feature => {
      if (feature.properties && feature.properties.ISO_A3) {
        let countryName = feature.properties.ISO_A3;
        let centroid = d3.geoCentroid(feature);
        centroids[countryName] = centroid;
      }
    });
    console.log(filteredFeatures)
  
    matrix = matrix.map(item => {
      let [source, target, value, name_source, name_target] = item;
      let sourceCentroid = centroids[name_source] || null;
      let targetCentroid = centroids[name_target] || null;
      return [source, target, value, name_source, name_target, sourceCentroid, targetCentroid];
    });
    console.log(matrix)
  
  draw_matrix(matrix, scales);
  draw_labels(data_1["nodes"], scales);
  
  let width = 960,
        height = 540;

    let proj = d3.geoMercator()
        .fitSize([width, height], data);

    let path = d3.geoPath()
        .projection(proj);

    let colorScale = d3.scaleQuantile()
        .domain(filteredFeatures.map(d => d.properties.GDP_Per_Capita_2022))
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

    originalData = nest(csvData);

    d3.select("#map")
        .selectAll("path")
        .data(filteredFeatures).enter()
        .append("path")
        .attrs({
            d: path,
            "stroke-width": 0,
            fill: d => colorScale(d.properties.GDP_Per_Capita_2022)
        })
        .on("mouseout", mouseout)
        .on("mouseover", function(event, d) {
            let selectedCountry = d.properties.Country_Name;
            updateLineChart(selectedCountry);
            mouseover(d);
        });

    d3.select("#name_map")
        .append("text")
        .attr("transform", "translate(50, 300)")
        .text("");
    
    d3.select("#map")
      .selectAll("line")
      .data(matrix.filter(row => !row.includes(null))).enter()
      .append("line")
      .attr("x1", d => proj(d[5])[0])
      .attr("y1", d => proj(d[5])[1])
      .attr("x2", d => proj(d[6])[0])
      .attr("y2", d => proj(d[6])[1])
      .attr("stroke", "none");
}

let margins = {left: 80, bottom: 80},
  neighbors;

function mouseover(d) {
    // Update stroke width and color of the map path
    d3.select("#map")
        .selectAll("path")
        .attr("stroke-width", e => e.properties.Country_Name == d.properties.Country_Name ? 2 : 1)
        .attr("stroke", e => e.properties.Country_Name == d.properties.Country_Name ? "#ff0000" : "#b8a2a2");

    // Display the country name
    d3.select("#name_map")
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

    d3.select("#name_map")
        .select("text")
        .text("");
}

function visualize_line(data) {
    let margin = { top: 10, right: 10, bottom: 20, left: 100 };
    
    data = nest(data);
    draw_axes(make_scales_gdp(data, margin),margin);
}

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

function make_scales_gdp(data, margin) {
    return {
        x: d3.scaleLog()
            .domain([2000, 2022])
            .range([margin.left, 1000 - margin.right]),
        y: d3.scaleLinear()
            .domain(d3.extent(data[0].map(d => d.GDP)))
            .range([200 - margin.bottom, margin.top])
    };
}

let count = 0;
function draw_lines(selectedCountry, nested, scales) {
    let path_generator = d3.line()
        .x(d => scales.x(d.Year))
        .y(d => scales.y(d.GDP));

    console.log(nested);
    if (count == 0) {
    d3.select("#lines")
        .selectAll("path")
        .data(nested, d => d.selectedCountry).enter()
        .append("path")
        .attrs({
            "d": path_generator,
            "fill": "none",
            "stroke": "darkblue",
            "stroke-width": 2,
            "id": selectedCountry
        });
    }
    count++;
        
    let paths = d3.select("#lines")
                    .selectAll("path")
                    .data(nested, d => d.selectedCountry);

    paths.enter()
            .append("path")
            .attr("id", selectedCountry)
            .attr("stroke", "darkblue")
            .attr("stroke-width", 2)
            .attr("fill", "none");

    paths.transition()
            .duration(500)
            .attr("d", path_generator);

    paths.exit().remove();
}

function draw_axes(scales, margin) {
    let x_axis = d3.axisBottom(scales.x).tickFormat(d3.format("d"));
    d3.select("#x_axis").append("g")
        .attr("transform", `translate(0, ${200 - margin.bottom})`)
        .call(x_axis);

    let y_axis = d3.axisLeft(scales.y).tickFormat(d3.format(".2s"));
    d3.select("#y_axis").append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(y_axis);
}

function updateLineChart(selectedCountry) {
    let margin = { top: 10, right: 10, bottom: 20, left: 100 };
    let filteredData = originalData.filter(d=> d[0].Country_Name == selectedCountry);
    updateYAxis(make_scales_gdp(filteredData,margin));
    draw_lines(selectedCountry, filteredData, make_scales_gdp(filteredData,margin));
}

function updateYAxis(myscale) {
    let margin = { top: 10, right: 10, bottom: 20, left: 100 };
    let y_axis = d3.axisLeft().scale(myscale.y).tickFormat(d3.format(".2s")),
        yAxisElement = d3.select("#axes").selectAll("#y_axis").data([0]);
    let yAxisEnter = yAxisElement.enter().append("g").attr("id", "y_axis");
    yAxisElement = yAxisEnter.merge(yAxisElement);

    yAxisElement.transition()
        .duration(500)
        .ease(d3.easeExp)
        .call(y_axis)
        .attr("transform", `translate(${margin.left}, 0)`);
}

function updateMap(year, data) {
    console.log(year)
    let legend = d3.select("#legend");
    let format = d3.format(".2s");
    let colorScale = d3.scaleQuantile()
        .domain(data.features.map(d => d.properties[`GDP_Per_Capita_${year}`]))
        .range(d3.schemeGreens[8]);

    d3.select("#map")
        .selectAll("path")
        .data(data.features)
        .transition()
        .duration(100)
        .attr("fill", d => colorScale(d.properties[`GDP_Per_Capita_${year}`]));

    legend.selectAll("rect")
        .data(colorScale.range())
        .attr("fill", d => d);
        
    legend.selectAll("text")
        .data(colorScale.quantiles())
        .enter().append("text")
        .attr("x", (_, i) => i * 25)
        .attr("y", 35)
        .text(d => format(d))
        .attr("dy", "0.35em");
        
    d3.select("#selected-year").text(year);
}
  
  
Promise.all([
    d3.json("International.json", d3.autoType),
    d3.json("countries_time.geojson", d3.autoType),
    d3.csv("countries.csv", d3.autoType)
])
    .then(([Data, geojsonData, csvData]) => {
        visualize(Data,geojsonData,csvData);
        visualize_line(csvData);
        d3.select("#year-slider")
          .on("input", function () {
                let selectedYear = this.value;
                updateMap(selectedYear, geojsonData);
            });
    });  
