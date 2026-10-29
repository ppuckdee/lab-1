import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from "../global.js";

const projects = await fetchJSON("../lib/projects.json");
const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");

renderProjects(projects, projectsContainer, "h2");
projectsTitle.textContent = `Projects (${projects.length})`;

function renderPieChart(projectsGiven) {
  d3.select("#projects-plot").selectAll("path").remove();
  d3.select(".legend").selectAll("*").remove();

  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let selectedIndex = -1;

  function selectYear(index) {
    selectedIndex = selectedIndex === index ? -1 : index;

    d3.select("#projects-plot")
      .selectAll("path")
      .classed("selected", (d, i) => i === selectedIndex);

    d3.select(".legend")
      .selectAll("li")
      .classed("selected", (d, i) => i === selectedIndex);

    let filteredProjects = projectsGiven;

    if (selectedIndex !== -1) {
      let selectedYear = data[selectedIndex].label;

      filteredProjects = projectsGiven.filter(
        (project) => project.year === selectedYear,
      );
    }

    renderProjects(filteredProjects, projectsContainer, "h2");
    projectsTitle.textContent = `Projects (${filteredProjects.length})`;
  }

  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);

  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  arcs.forEach((arc, i) => {
    d3.select("#projects-plot")
      .append("path")
      .attr("d", arc)
      .attr("fill", colors(i))
      .on("click", () => selectYear(i));
  });

  let legend = d3.select(".legend");

  data.forEach((d, i) => {
    legend
      .append("li")
      .attr("class", "legend-item")
      .attr("style", `--color: ${colors(i)}`)
      .html(`
        <span class="swatch"></span>
        ${d.label} <em>(${d.value})</em>
      `)
      .on("click", () => selectYear(i));
  });
}

renderPieChart(projects);

let query = "";
const searchInput = document.querySelector(".searchBar");

searchInput.addEventListener("input", (event) => {
  query = event.target.value;

  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join("\n").toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderProjects(filteredProjects, projectsContainer, "h2");
  renderPieChart(filteredProjects);
  projectsTitle.textContent = `Projects (${filteredProjects.length})`;
});