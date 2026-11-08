import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function loadData() {
  return d3.csv(new URL("loc.csv", import.meta.url), (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(`${row.date}T00:00${row.timezone}`),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([id, lines]) => {
      const { author, date, time, timezone, datetime } = lines[0];

      const commit = {
        id,
        url: `https://github.com/ppuckdee/lab-1/commit/${id}`,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(commit, "lines", {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return commit;
    });
}

function renderCommitInfo(data, commits) {
  const fileLengths = d3.rollups(
    data,
    (lines) => d3.max(lines, (d) => d.line),
    (d) => d.file,
  );

  const integer = d3.format(",");
  const decimal = d3.format(".1f");

  const stats = [
    { label: "Total lines of code", value: integer(data.length) },
    { label: "Commits represented", value: integer(commits.length) },
    { label: "Files", value: integer(fileLengths.length) },
    {
      label: "Maximum file length (lines)",
      value: integer(d3.max(fileLengths, (d) => d[1]) ?? 0),
    },
    {
      label: "Average line length (characters)",
      value: decimal(d3.mean(data, (d) => d.length) ?? 0),
    },
    {
      label: "Maximum indentation depth",
      value: integer(d3.max(data, (d) => d.depth) ?? 0),
    },
  ];

  const container = d3.select("#stats");
  container.selectAll("*").remove();

  const dl = container.append("dl").attr("class", "stats");

  for (const stat of stats) {
    const item = dl.append("div");
    item.append("dt").text(stat.label);
    item.append("dd").text(stat.value);
  }

  container
    .append("p")
    .text(
      "These statistics describe the analyzed code. Only commits that still " +
        "contribute lines to the current code appear in this dataset.",
    );
}

function createBrushSelector(svg, commits, xScale, yScale, plot) {
  const dots = svg.select(".dots").selectAll("circle");

  const brush = d3
    .brush()
    .extent([
      [plot.left, plot.top],
      [plot.right, plot.bottom],
    ])
    .on("start brush end", (event) => {
      hideTooltip();

      const selection = event.selection;

      const selectedCommits = selection
        ? commits.filter((commit) => {
            const [[x0, y0], [x1, y1]] = selection;
            const x = xScale(commit.datetime);
            const y = yScale(commit.hourFrac);

            return x >= x0 && x <= x1 && y >= y0 && y <= y1;
          })
        : [];

      const selectedIds = new Set(selectedCommits.map((d) => d.id));

      dots.classed("selected", (d) => selectedIds.has(d.id));

      const count = selectedCommits.length;

      d3.select("#selection-count").text(
        count === 0
          ? "No commits selected"
          : `${count} ${count === 1 ? "commit" : "commits"} selected`,
      );

      const lines = selectedCommits.flatMap((d) => d.lines);

      const breakdown = d3
        .rollups(
          lines,
          (group) => group.length,
          (d) => d.type,
        )
        .sort((a, b) => b[1] - a[1]);

      const container = d3.select("#language-breakdown");
      container.selectAll("*").remove();

      for (const [language, lineCount] of breakdown) {
        const percentage = d3.format(".1~%")(lineCount / lines.length);

        container.append("dt").text(language.toUpperCase());
        container
          .append("dd")
          .text(`${d3.format(",")(lineCount)} lines (${percentage})`);
      }
    });

  const brushLayer = svg.append("g").attr("class", "brush").call(brush);

  // Keep the dots above the brush overlay so tooltips still work.
  svg.select(".dots").raise();

  d3.select("#clear-selection").on("click", () => {
    brushLayer.call(brush.move, null);
  });
}

function renderScatterPlot(commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 30, bottom: 65, left: 75 };

  const plot = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
  };

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "Scatterplot showing commit dates and times of day");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([plot.left, plot.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([plot.bottom, plot.top]);

  // Horizontal gridlines.
  svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${plot.left}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(12)
        .tickFormat("")
        .tickSize(-(plot.right - plot.left)),
    );

  // Date axis.
  svg
    .append("g")
    .attr("transform", `translate(0, ${plot.bottom})`)
    .call(d3.axisBottom(xScale).ticks(6));

  // Time-of-day axis.
  svg
    .append("g")
    .attr("transform", `translate(${plot.left}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(12)
        .tickFormat((hour) => `${String(hour % 24).padStart(2, "0")}:00`),
    );

  // Axis labels.
  svg
    .append("text")
    .attr("x", (plot.left + plot.right) / 2)
    .attr("y", height - 15)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text("Commit date");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(plot.top + plot.bottom) / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text("Time of day (your local time)");

  // Square-root radius makes dot area proportional to line count.
  const rScale = d3
    .scaleSqrt()
    .domain([0, d3.max(commits, (d) => d.totalLines) || 1])
    .range([0, 30]);

  // Draw smaller dots last so they remain easier to hover.
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  svg
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(sortedCommits)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .attr("tabindex", 0)
    .attr("role", "link")
    .attr("aria-label", (d) => `View commit ${d.id} on GitHub`)
    .on("mouseenter", showTooltip)
    .on("mousemove", positionTooltip)
    .on("mouseleave", hideTooltip)
    .on("focus", (event, commit) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      showTooltip({ clientX: bounds.right, clientY: bounds.top }, commit);
    })
    .on("blur", hideTooltip)
    .on("click", (event, commit) => {
      window.open(commit.url, "_blank", "noopener,noreferrer");
    })
    .on("keydown", (event, commit) => {
      if (event.key === "Enter") {
        window.open(commit.url, "_blank", "noopener,noreferrer");
      }
    });

  createBrushSelector(svg, commits, xScale, yScale, plot);
}

const data = await loadData();
const commits = processCommits(data);

renderCommitInfo(data, commits);

function positionTooltip(event) {
  const tooltip = document.getElementById("commit-tooltip");
  const bounds = tooltip.getBoundingClientRect();

  const left = Math.max(
    8,
    Math.min(event.clientX + 12, window.innerWidth - bounds.width - 8),
  );

  const top = Math.max(
    8,
    Math.min(event.clientY + 12, window.innerHeight - bounds.height - 8),
  );

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showTooltip(event, commit) {
  const link = document.getElementById("commit-link");
  link.href = commit.url;
  link.textContent = commit.id;

  document.getElementById("commit-date").textContent =
    commit.datetime.toLocaleDateString(undefined, { dateStyle: "full" });

  document.getElementById("commit-time").textContent =
    commit.datetime.toLocaleTimeString(undefined, { timeStyle: "short" });

  document.getElementById("commit-author").textContent = commit.author;
  document.getElementById("commit-lines").textContent = commit.totalLines;

  document.getElementById("commit-tooltip").hidden = false;
  positionTooltip(event);
}

function hideTooltip() {
  document.getElementById("commit-tooltip").hidden = true;
}

renderScatterPlot(commits);
