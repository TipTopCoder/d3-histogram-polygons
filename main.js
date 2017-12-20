$(function() {
  $(document).ready(init);

  function init() {
    // set the dimensions and margins of the graph
    var margin = {top: 20, right: 20, bottom: 95, left: 50};
    var width = $('#chart-wrapper').width();
    var height = 400;
    var parseYear = d3.timeFormat("%Y");
    
    var chart = d3.select("#js-chart")
            .attr("width", width)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    var innerChartWidth = width - margin.left;

    var xChart = d3.scaleBand()
            .range([0, innerChartWidth]);
            
    var yChart = d3.scaleLinear()
            .range([height, 0]);
    
    var xAxis = d3.axisBottom(xChart);
    var yAxis = d3.axisLeft(yChart);

    var groupedData = {};
    var locations = [];
    var subjects = [
      {
        value: 'TOT',
        label: 'Both men and women'
      },
      {
        value: 'MEN',
        label: 'Men'
      },
      {
        value: 'WOMEN',
        label: 'Women'
      },
    ]
    function guiMenu() {
      this.location = 0;
      this.subject = 0;
      this.definition = function() {
        $('#definitionModal').modal('show')
      };
      this.percentile = 99;
    }
    var guiMenuInstance = new guiMenu();
    var gui = new dat.GUI();
    gui.add(guiMenuInstance, 'definition');
    var percentileCtrl = null;
    
    //set up axes
    //left axis
    chart.append("g")
        .attr("class", "yAxis")
        .call(yAxis)
    
    //add labels
    chart
      .append("text")
      .attr("transform", "translate(-35," +  (height+margin.bottom)/2 + ") rotate(-90)")
      .text("suicide rates");
        
    chart
      .append("text")
      .attr("transform", "translate(" + (width - 15 - margin.left)/2 + "," + (height + 60) + ")")
      .text("years");
    
    chart.append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('x', 1)
      // Stretch to cover x axis
      .attr('y', 0)
      .attr('width', innerChartWidth)
      .attr('height', height + 35);

    var barWrapper = chart
      .append('g')
      .attr('clip-path', 'url(#clip)')
      .append('g')
      .datum(
        {x: 0, y: 0}
      )
      .attr('id', 'bar-wrapper')
      .attr("transform", function(d) {
        return `translate( ${d.x} , ${d.y} )`
      })
      // .call(d3.drag()
      //   .on("start", dragStart)
      //   .on("drag", dragged)
      //   .on("end", dragEnd));
        
    //bottom axis
    barWrapper.append("g")
      .attr("class", "xAxis")
      .datum({x: 0, y: height})
      .attr("transform", function(d) {
        return "translate("+ d.x +"," + d.y + ")"
      })
      .call(xAxis)
      .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", function(d){
          return "rotate(-65)";
        });

    var countChartObj = new initCountChart();
    var cCountChartObj = new initCCountChart();

    // get the data
    d3.csv("data.csv", function(error, parsedData) {
      if (error) throw error;
      //console.log(parsedData)
      parsedData.forEach(function(row) {
        if(!groupedData[row.LOCATION]) {
          groupedData[row.LOCATION] = {
            TOT: [],
            WOMEN: [],
            MEN: []
          };
        }
        if(locations.indexOf(row.LOCATION) === -1) {
          locations.push(row.LOCATION);
        }
        groupedData[row.LOCATION][row.SUBJECT].push({
          year: row.TIME,
          value: row.Value
        })
      })

      guiMenuInstance.location = locations.find(function(location) {
        return location === 'CAN'
      });
      guiMenuInstance.subject = subjects[0].value;
      var locationCtrl = gui.add(
        guiMenuInstance, 
        'location', 
        locations.sort()
      );
      var subjectCtrl = gui.add(
        guiMenuInstance, 
        'subject', 
        subjects.reduce(function(accumulative, current) { 
          accumulative[current.label] = current.value
          return accumulative;
        }, {})
      );
      percentileCtrl = gui.add(guiMenuInstance, 'percentile', 1, 99, 1);

      locationCtrl.onChange(function(val) {
        update(val, subjectCtrl.getValue());
      })
      subjectCtrl.onChange(function(val) {
        update(locationCtrl.getValue(), val);
      })
      percentileCtrl.onChange(function(val) {
        update(locationCtrl.getValue(), subjectCtrl.getValue())
      })

      update(locationCtrl.getValue(), subjectCtrl.getValue());
    });

    function update(location, subject){
      if(!groupedData[location]) {
        return;
      }

      data = groupedData[location][subject];
      // guiMenuInstance.year = 'all';
      // var yearSet = data.map(function(singleData) { return singleData.year });
      // yearSet.unshift('all');
      // gui.add(guiMenuInstance, 'year', yearSet);

      // console.log(data)
      $('#distributed-table u').text(location);
      distributionTable(groupedData[location]);

      //set domain for the x axis
      xChart.domain(data.map(function(d){ return d.year; }) );
      //set domain for y axis
      yChart.domain( [0, d3.max(data, function(d){ return +d.value; })] );
      
      //get the width of each bar 
      var barWidth = innerChartWidth / data.length;
      
      //select all bars on the graph, take them out, and exit the previous data set. 
      //then you can add/enter the new data set
      var bars = barWrapper.selectAll(".bar").data(data);

      bars.exit().remove();
      //now actually give each rectangle the corresponding data
      bars.enter()
        .append("rect")
        .attr("class", "bar")
        .merge(bars)
        .attr("x", function(d, i){ return i * barWidth + 1 })
        .attr("height", 0)
        .attr("y", function(d){ return height; })
        .attr("width", barWidth - 1)
        .attr("data-toggle", "tooltip")
        .attr("title", function(d) {
          return d.value;
        })
        .attr("data-original-title", function(d) {
          return d.value;
        })
        .attr("fill", "rgb(251,180,174)");

      barWrapper.selectAll(".bar")
        .transition().duration(500)
        .attr("height", function(d){ return height - yChart(d.value); })
        .attr("y", function(d){ return yChart( d.value); })
      

      $('body').find('[data-toggle="tooltip"]').tooltip();

      //left axis
      chart.select('.yAxis')
      .transition().duration(500)
          .call(yAxis)

      //bottom axis
      chart.select('.xAxis')
        .transition().duration(500)
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", ".15em")
          .attr("transform", function(d){
            return "rotate(-65)";
          });
          
    }//end update

    function distributionTable(data) {
      //console.log(count(data))
      let {
        ranges,
        distributedData
      } = count(data);
      var tableBody = d3.select('#distributed-table tbody');
      tableBody.selectAll('tr').html('');
      for(var i = 0; i < ranges.length; i++) {
        var totalData = distributedData.TOT;
        var menData = distributedData.MEN;
        var womenData = distributedData.WOMEN;
        var row = tableBody.append('tr');

        row.append('td').text(`[${ranges[i] - 1} - ${ranges[i]})`);
        row.append('td').text(totalData[ranges[i]].count);
        row.append('td').text(totalData[ranges[i]].ccount);
        row.append('td').text(menData[ranges[i]].count);
        row.append('td').text(menData[ranges[i]].ccount);
        row.append('td').text(womenData[ranges[i]].count);
        row.append('td').text(womenData[ranges[i]].ccount);
      }
      
      var statsTable = d3.select('#count-stats tbody');
      statsTable.selectAll('tr').html('');
      subjects.forEach(function(subject) {
        var statsData = data[subject.value].map(function(datum) {
          return parseFloat(datum.value);
        })
        var stats = statsCalculate(statsData);
        console.log(subject.value, stats);
        var row = statsTable.append('tr');
        row.append('td').text(subject.value);
        row.append('td').text(stats.meanVal);
        row.append('td').text(stats.medianVal);
        row.append('td').text(stats.modeVal.join(', '));
        row.append('td').text(stats.geometricMeanVal);
        row.append('td').text(stats.rangeVal[1] - stats.rangeVal[0]);
        row.append('td').text(truncate(stats.quartileVal.third - stats.quartileVal.first));
        row.append('td').text(stats.percentileVal(percentileCtrl.getValue()))
        var varianceRow = row.append('td');
        varianceRow.append('p').text(`Sample: ${stats.varianceVal.sample}`);
        varianceRow.append('p').text(`Population: ${stats.varianceVal.population}`);
        var stdDeviationRow = row.append('td');
        stdDeviationRow.append('p').text(`Sample: ${stats.stdDeviationVal.sample}`);
        stdDeviationRow.append('p').text(`Population: ${stats.stdDeviationVal.population}`);
      })

      countChartObj.updateCount({ranges, distributedData});
      cCountChartObj.updateCCount({ranges, distributedData});
    }

    function count(data) {
      console.log({data})
      var distributedData = {
        MEN: {},
        WOMEN: {},
        TOT: {}
      }
      var filteredData = {
        MEN: [],
        WOMEN: [],
        TOT: []
      }

      var ranges = [];
      subjects.forEach(function(subject) {
        data[subject.value].forEach(function(datum) {
          if(!distributedData[subject.value][Math.floor(datum.value)+1]) {
            distributedData[subject.value][Math.floor(datum.value)+1] = {
              count: 0,
              ccount: 0
            }
          }
          distributedData[subject.value][Math.floor(datum.value)+1].count++;
        })
        var keys = Object.keys(distributedData[subject.value]);
        keys.forEach(function(key, idx) {
          if(idx > 0) {
            // console.log(distributedData[subject.value][key-1])
            distributedData[subject.value][keys[idx]].ccount = distributedData[subject.value][keys[idx]].count + distributedData[subject.value][keys[idx-1]].ccount;
          } else {
            distributedData[subject.value][keys[idx]].ccount = distributedData[subject.value][keys[idx]].count;
          }
          if(ranges.indexOf(parseInt(key)) === -1) {
            ranges.push(parseInt(key))
          }
        })
      })
      var maxRange = ranges.reduce(function(a, b) {
        return Math.max(a,b);
      })

      var minRange = ranges.reduce(function(a, b) {
        return Math.min(a,b);
      })

      if(minRange < 1) {
        minRange = 1;
      } 

      for(var i = minRange - 1; i <= maxRange + 1; i++) {
        if(ranges.indexOf(i) === -1) {
          ranges.push(i);
        }
      }

      ranges = ranges.sort(function(a,b) {
        return a - b;
      })

      subjects.forEach(function(subject) {
        ranges.forEach(function(range, idx) {
          if(distributedData[subject.value][range]) {
            distributedData[subject.value][range].range = range;
            if(idx === 0) {
              distributedData[subject.value][range].ccount = distributedData[subject.value][range].count;
            } else {
              distributedData[subject.value][range].ccount = distributedData[subject.value][range].count + distributedData[subject.value][range-1].ccount;
            }
          } else {
            distributedData[subject.value][range] = {};
            distributedData[subject.value][range].range = range;
            distributedData[subject.value][range].count = 0;
            if(idx === 0) {
              distributedData[subject.value][range].ccount = 0;
            } else {
              distributedData[subject.value][range].ccount = distributedData[subject.value][range - 1].ccount;
            }
          }
        })
      })

      console.log({ranges, distributedData})
      return {
        ranges,
        distributedData
      }
    }

    function initCountChart() {
      var cMargin = {top: 20, right: 20, bottom: 95, left: 50};
      var cWidth = $('#count-chart-wrapper').width();
      var cHeight = 300;
      
      var countChart = d3.select("#js-count")
              .attr("width", cWidth)
              .attr("height", cHeight + cMargin.top + cMargin.bottom)
              .append("g")
              .attr("transform", "translate(" + cMargin.left + "," + cMargin.top + ")");
      
      var cinnerChartWidth = cWidth - cMargin.left;

      var xcChart = d3.scaleBand()
              .range([0, cinnerChartWidth]);
              
      var ycChart = d3.scaleLinear()
              .range([cHeight, 0]);

      var colors = d3.scaleOrdinal(d3.schemeCategory10);
      
      var xcAxis = d3.axisBottom(xcChart);
      var ycAxis = d3.axisLeft(ycChart);

      var line = d3.line()
        .x(function(d) { return xcChart(d.range); })
        .y(function(d) { return ycChart(d.count); });
      //set up axes
      //left axis
      countChart.append("g")
        .attr("class", "yAxis")
        .call(ycAxis)

      //add labels
      countChart
        .append("text")
        .attr("transform", "translate(-35," +  (cHeight+cMargin.bottom)/2 + ") rotate(-90)")
        .text("frequency");
          
      countChart
        .append("text")
        .attr("transform", "translate(" + (cWidth - 15*4 - cMargin.left)/2 + "," + (cHeight + 60) + ")")
        .text("suicide rates");

      countChart.append('clipPath')
        .attr('id', 'count-clip')
        .append('rect')
        .attr('x', 1)
        // Stretch to cover x axis
        .attr('y', 0)
        .attr('width', cinnerChartWidth)
        .attr('height', cHeight + 35);

      var cBarWrapper = countChart
        .append('g')
        .attr('clip-path', 'url(#count-clip)')
        .append('g')
        .datum(
          {x: 0, y: 0}
        )
        .attr('id', 'count-line-wrapper')
        .attr("transform", function(d) {
          return `translate( ${d.x} , ${d.y} )`
        });
          
      //bottom axis
      cBarWrapper.append("g")
        .attr("class", "xAxis")
        .datum({x: 0, y: cHeight})
        .attr("transform", function(d) {
          return "translate("+ d.x +"," + d.y + ")"
        })
        .call(xcAxis)
        .selectAll("text")
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", "-.5em")
          .attr("transform", function(d){
            return "rotate(-90)";
          });

      this.updateCount = function({ranges, distributedData}) {
        var renderData = groupingData({ranges, distributedData})
        console.log({renderData})

        //set domain for the x axis
        xcChart.domain(ranges.map(function(d){ return d; }) );
        //set domain for y axis
        ycChart.domain([
          d3.min(renderData, function(c) { 
            return d3.min(
              c.values, 
              function(d) { return d.count; }
            ); 
          }),
          d3.max(renderData, function(c) { 
            return d3.max(
              c.values, 
              function(d) { return d.count; }
            ); 
          })
        ]);
        colors(renderData.map(function(r) { return r.id; }))


        var legend = countChart.selectAll(".cLegend")
          .data(renderData)
          .enter().append("g")
          .attr("class", "cLegend")
          .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
        
        legend.append("rect")
            .attr("x", 30)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", function(d) {
              return colors(d.id)
            });
        
        legend.append("text")
            .attr("x", 30 + 27)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text(function(d) { return `${d.subject.value} - ${d.subject.label}`; });
        
        counts = cBarWrapper.selectAll('.count-line').data(renderData);
        counts.exit().remove();
        counts.enter().append('path')
          .attr("class", "count-line frequency-line")
          .style("stroke", function(d) { return colors(d.id); })
          .style("fill-opacity", 0)
          .merge(counts)
          .transition().duration(500)
          .attr("d", function(d) {
            return line(d.values)
          }); 
        //left axis
        countChart.select('.yAxis')
          .transition().duration(500)
          .call(ycAxis)
        //bottom axis
        countChart.select('.xAxis')
          .transition().duration(500)
          .attr("transform", "translate(0," + cHeight + ")")
          .call(xcAxis)
          .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.5em")
            .attr("transform", function(d){
              return "rotate(-90)";
            });
      }
    }
    function initCCountChart() {
      var ccMargin = {top: 20, right: 20, bottom: 95, left: 50};
      var ccWidth = $('#ccount-chart-wrapper').width();
      var ccHeight = 300;
      
      var cCountChart = d3.select("#js-ccount")
              .attr("width", ccWidth)
              .attr("height", ccHeight + ccMargin.top + ccMargin.bottom)
              .append("g")
              .attr("transform", "translate(" + ccMargin.left + "," + ccMargin.top + ")");
      
      var ccinnerChartWidth = ccWidth - ccMargin.left;

      var xccChart = d3.scaleBand()
              .range([0, ccinnerChartWidth]);
              
      var yccChart = d3.scaleLinear()
              .range([ccHeight, 0]);

      var colors = d3.scaleOrdinal(d3.schemeCategory10);
      
      var xccAxis = d3.axisBottom(xccChart);
      var yccAxis = d3.axisLeft(yccChart);

      var ccline = d3.line()
        .x(function(d) { return xccChart(d.range); })
        .y(function(d) { return yccChart(d.ccount); });
      //set up axes
      //left axis
      cCountChart.append("g")
        .attr("class", "yAxis")
        .call(yccAxis)

      //add labels
      cCountChart
        .append("text")
        .attr("transform", "translate(-35," +  (ccHeight + ccMargin.bottom)/1.8 + ") rotate(-90)")
        .text("cumulative frequency");
          
      cCountChart
        .append("text")
        .attr("transform", "translate(" + (ccWidth - 15*4 - ccMargin.left)/2 + "," + (ccHeight + 60) + ")")
        .text("suicide rates");

      cCountChart.append('clipPath')
        .attr('id', 'ccount-clip')
        .append('rect')
        .attr('x', 1)
        // Stretch to cover x axis
        .attr('y', 0)
        .attr('width', ccinnerChartWidth)
        .attr('height', ccHeight + 35);

      var ccBarWrapper = cCountChart
        .append('g')
        .attr('clip-path', 'url(#ccount-clip)')
        .append('g')
        .datum(
          {x: 0, y: 0}
        )
        .attr('id', 'count-line-wrapper')
        .attr("transform", function(d) {
          return `translate( ${d.x} , ${d.y} )`
        });
          
      //bottom axis
      ccBarWrapper.append("g")
        .attr("class", "xAxis")
        .datum({x: 0, y: ccHeight})
        .attr("transform", function(d) {
          return "translate("+ d.x +"," + d.y + ")"
        })
        .call(xccAxis)
        .selectAll("text")
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", "-.5em")
          .attr("transform", function(d){
            return "rotate(-90)";
          });

      this.updateCCount = function({ranges, distributedData}) {
        var renderData = groupingData({ranges, distributedData})
        console.log({renderData})

        //set domain for the x axis
        xccChart.domain(ranges.map(function(d){ return d; }) );
        //set domain for y axis
        yccChart.domain([
          d3.min(renderData, function(c) { 
            return d3.min(
              c.values, 
              function(d) { return d.ccount; }
            ); 
          }),
          d3.max(renderData, function(c) { 
            return d3.max(
              c.values, 
              function(d) { return d.ccount; }
            ); 
          })
        ]);
        colors(renderData.map(function(r) { return r.id; }))

        var cclegend = cCountChart.selectAll(".ccLegend")
          .data(renderData)
          .enter().append("g")
          .attr("class", "ccLegend")
          .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
        
        cclegend.append("rect")
            .attr("x", 30)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", function(d) {
              return colors(d.id)
            });
        
        cclegend.append("text")
            .attr("x", 30 + 27)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text(function(d) { return `${d.subject.value} - ${d.subject.label}`; });
        
        cCounts = ccBarWrapper.selectAll('.ccount-line').data(renderData);
        cCounts.exit().remove();
        cCounts.enter().append('path')
          .attr("class", "ccount-line frequency-line")
          .style("stroke", function(d) { return colors(d.id); })
          .style("fill-opacity", 0)
          .merge(cCounts)
          .attr("d", function(d) {
            return ccline(d.values)
          }); 
        //left axis
        cCountChart.select('.yAxis')
          .transition().duration(500)
          .call(yccAxis)
        //bottom axis
        cCountChart.select('.xAxis')
          .transition().duration(500)
          .attr("transform", "translate(0," + ccHeight + ")")
          .call(xccAxis)
          .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.5em")
            .attr("transform", function(d){
              return "rotate(-90)";
            });
      }
    }
    /**
     * The "mean" is the "average" you're used to, where you add up all the numbers
     * and then divide by the number of numbers.
     *
     * For example, the "mean" of [3, 5, 4, 4, 1, 1, 2, 3] is 2.875.
     *
     * @param {Array} numbers An array of numbers.
     * @return {Number} The calculated average (or mean) value from the specified
     *     numbers.
     */
    function mean(numbers) {
      var total = 0, i;
      for (i = 0; i < numbers.length; i++) {
          total += numbers[i];
      }
      return truncate(total / numbers.length);
    }

    /**
    * The "median" is the "middle" value in the list of numbers.
    *
    * @param {Array} numbers An array of numbers.
    * @return {Number} The calculated median value from the specified numbers.
    */
    function median(numbers) {
      // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
      var median = 0, numsLen = numbers.length;

      if (
          numsLen % 2 === 0 // is even
      ) {
          // average of two middle numbers
          median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
      } else { // is odd
          // middle number only
          median = numbers[(numsLen - 1) / 2];
      }

      return median;
    }

    /**
    * The "mode" is the number that is repeated most often.
    *
    * For example, the "mode" of [3, 5, 4, 4, 1, 1, 2, 3] is [1, 3, 4].
    *
    * @param {Array} numbers An array of numbers.
    * @return {Array} The mode of the specified numbers.
    */
    function mode(numbers) {
      // as result can be bimodal or multi-modal,
      // the returned result is provided as an array
      // mode of [3, 5, 4, 4, 1, 1, 2, 3] = [1, 3, 4]
      var modes = [], count = [], i, number, maxIndex = 0;

      for (i = 0; i < numbers.length; i += 1) {
          number = numbers[i];
          count[number] = (count[number] || 0) + 1;
          if (count[number] > maxIndex) {
              maxIndex = count[number];
          }
      }

      for (i in count)
          if (count.hasOwnProperty(i)) {
              if (count[i] === maxIndex) {
                  modes.push(Number(i));
              }
          }

      return modes;
    }

    /**
    * The "range" of a list a numbers is the difference between the largest and
    * smallest values.
    *
    * For example, the "range" of [3, 5, 4, 4, 1, 1, 2, 3] is [1, 5].
    *
    * @param {Array} numbers An array of numbers.
    * @return {Array} The range of the specified numbers.
    */
    function range(numbers) {
      return [Math.floor(numbers[0]), Math.ceil(numbers[numbers.length - 1])];
    }

    function geometricMean(numbers) {
      var multiply = 1, i;
      for (i = 0; i < numbers.length; i += 1) {
        multiply *= numbers[i];
      }
      return truncate(Math.pow(multiply, 1/numbers.length));
    }

    function quartile(numbers) {
      if(numbers.lengh < 4) {
        return false;
      }
      var index = numbers.length % 2 === 0 ? numbers.length/2 : Math.floor(numbers.length/2)
      console.log({index, numbers})
      return {
        first: truncate(median(numbers.slice(0, index))),
        third: truncate(median(numbers.slice(index)))
      }
    }

    function variance(numbers, meanValue) {
      var total = 0;
      for(var i = 0; i < numbers.length; i++) {
        total += Math.pow(numbers[i] - meanValue, 2) 
      }

      return {
        population: truncate(total/numbers.length),
        sample: truncate(total/(numbers.length - 1))
      }
    }

    function percentile(numbers, percent) {
      var index = 0;
      if(numbers.lengh*percent/100 !== 0) {
        index = Math.floor(numbers.length*percent/100);
        return numbers[index];
      } else {
        index = numbers.lengh*percent/100;
        return (numbers[index] + numbers[index-1])/2
      }
    }
    
    function truncate(value) {
      return Math.floor(value*100)/100;
    }

    function statsCalculate(numbers) {
      numbers.sort(function(a, b) {
        return a - b;
      });
      console.log({numbers});
      var meanVal = mean(numbers);
      var medianVal = median(numbers);
      var modeVal = mode(numbers);
      var geometricMeanVal = geometricMean(numbers);
      var rangeVal = range(numbers);
      var quartileVal = quartile(numbers);
      var percentileVal = function(percent){ return percentile(numbers, percent);  };
      var varianceVal = variance(numbers, meanVal);
      var stdDeviationVal = {
        sample: truncate(Math.sqrt(varianceVal.sample)),
        population: truncate(Math.sqrt(varianceVal.population)),
      };

      return {
        meanVal,
        medianVal,
        modeVal,
        geometricMeanVal,
        rangeVal,
        quartileVal,
        percentileVal,
        varianceVal,
        stdDeviationVal
      }
    }

    function groupingData({ranges, distributedData}) {
      return subjects.map(function(subject, id) {
        var values = ranges.map(function(range) {
          return distributedData[subject.value][range]
        })
        var countValues = values.reduce(function(accumulator, current) {
          if(current.count > 0) {
            accumulator.push(current.count);
          }
          return accumulator
        }, [])
        return {
          id,
          subject,
          values
        }
      })
    }
  }
})
