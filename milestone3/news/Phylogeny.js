
function make_tree(data) {
  data['links'].push({to: 1, from: null});
  let stratifier = d3.stratify()
    .id(d => d.to)
    .parentId(d => d.from),
  tree_gen = d3.tree()
    .size([800, 600]);
  return tree_gen(stratifier(data['links']));
}

function visualize(data) {
  tree = make_tree(data);
  let link_gen = d3.linkVertical()
    .x(d => d.x)
    .y(d => d.y);

  d3.select("#tree")
    .selectAll("path")
    .data(tree.links()).enter()
    .append("path")
    .attrs({
      d: link_gen,
      transform: "translate(0, 10)", // so doesn't go off page
      "stroke-width": 0.05
    })
    
  const entriesWithCountry = data['nodes'].filter(item => item.hasOwnProperty('country'));
  const countries = entriesWithCountry.map(item => item.country);
  const countryCounts = {};
  countries.forEach(country => {
      countryCounts[country] = (countryCounts[country] || 0) + 1;
  });
  const threshold = 2;
  const newData = data['nodes'].map(item => {
      if (item.hasOwnProperty('country')) {
          if (countryCounts[item.country] <= threshold) {
              item.country = 'Other';
          }
      } else {
          item.country = 'Unknown';
      }
      return item;
  }).map((item, index) => ({
      ...item,
      id: index + 1 
  }));
  
  const uniqueCountries = [...new Set(newData.map(d => d.country))];
  const colorScale = d3.scaleOrdinal()
                       .domain(uniqueCountries)
                       .range(uniqueCountries.map(country => country === 'Unknown' ? '#CCCCCC' : d3.schemeSet2[uniqueCountries.indexOf(country)]))
                       
  d3.select("#tree")
    .selectAll("circle")
    .data(tree.descendants()).enter()
    .append("circle")
    .attrs({
      cx: d => d.x,
      cy: d => d.y,
      r: d => radius(d.depth),
      fill: d => colorScale(newData.find(item => item.id == d.id).country),
      transform: "translate(0, 10)"
    })

  neighborhoods = d3.Delaunay.from(tree.descendants().map(d => [d.x, d.y]))
  d3.select("svg").on("mousemove", (ev) => update_labels(ev, neighborhoods, tree));
}

function focus_ids(cur_node) {
    descendants = cur_node.descendants().map(d => d.id)
    ancestors = cur_node.ancestors().map(d => d.id)
    return ancestors.concat(descendants)
}

function highlight(d, i, ix, focus) {
  if (i == ix) {
    return 1
  } else if (focus.indexOf(d.id) != -1) {
    return 0
  }
  return -1
}

function update_labels(ev, neighborhoods, tree) {
  let pos = d3.pointer(ev),
    ix = neighborhoods.find(pos[0], pos[1]),
    cur_node = tree.descendants()[ix],
    focus = focus_ids(cur_node)

  d3.select("#tree")
    .selectAll("circle")
    .transition().duration(5)
    .attrs({
      r: (d, i) => {
        let relevance = highlight(d, i, ix, focus)
        return relevance == 1 ? 8 : relevance == 0 ? 4 : 2
      }/*,
      fill: (d, i) => highlight(d, i, ix, focus) >= 0 ? "red" : "blue"*/
    })

  d3.select("#tree")
    .selectAll("path")
    .transition().duration(5)
    .attr("stroke-width", d => focus.indexOf(d.target.id) == -1 ? 0.05 : 1)

  d3.select("#labels")
    .selectAll("text")
    .text(cur_node.id)
    .attr("transform", `translate(${cur_node.x}, ${cur_node.y})`)
}

function radius(depth) {
  return 10 * Math.exp(-.5 * depth)
}

function handleSelectChange() {
    const selectedCountries = Array.from(document.getElementById('country_select').selectedOptions)
                              .map(option => option.value);
                              
    d3.json("covid.json").then(jsonData => {
      d3.select("#tree")
        .selectAll("circle")
        .attrs({
           r: d => jsonData['nodes'][d.id-1].country == selectedCountries ? 4 : 2
        })
    });
    
}

d3.json("covid.json")
  .then(visualize)