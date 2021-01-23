function ResourcePlot(selector, miniplot, autoScale, max) {
    this.selector = selector;
    this.miniplot = miniplot;
    this.plot = $.plot($(this.selector), [[]], {
        yaxis: {
            min: 0,
            show: false,
            tickFormatter: function() {
                return "";
            },
            ticks: 10
        },
        xaxis: {
            show: false,
            tickFormatter: function() {
                return "";
            },
            ticks: 6
        },
        series: {
            lines: {
                lineWidth: 1,
                fill: true
            },
            shadowSize: 0
        },
        grid: {
            borderWidth: 1,
            margin: 0,
            minBorderMargin: 0,
            labelMargin: 0
        },
        legend: {
            position: "sw",
            backgroundOpacity: 0
        }
    });
    if(!this.miniplot) {
        this.plot.getAxes().xaxis.options.show = true;
        this.plot.getAxes().yaxis.options.show = true;
    }
    this.min = 0;
    if(max !== undefined) {
        this.setMax(max);
    }
    this.autoScale = autoScale;
}

ResourcePlot.prototype.setMax = function(max) {
    this.max = max;
    this.plot.getAxes().yaxis.options.max = max;
    this.plot.getAxes().yaxis.options.tickSize = (max - this.min) / 10;
}

ResourcePlot.prototype.setMin = function(min) {
    this.min = min;
    this.plot.getAxes().yaxis.options.min = min;
    this.plot.getAxes().yaxis.options.tickSize = (this.max - min) / 10;
}

ResourcePlot.prototype.setData = function(data, titles) {
    var self = this;
    this.plotData = data;
    if(this.autoScale) {
        this.setMax(Math.max.apply(Math, this.plotData.getMaxValues()));
    }
    var dataWithOptionalTitle = [];
    if(titles) {
        titles.forEach(function(title, index) {
            dataWithOptionalTitle.push({
                data: self.plotData.get()[index],
                label: title
            });
        });
    } else {
        dataWithOptionalTitle = self.plotData.get();
    }
    this.plot.setData(dataWithOptionalTitle);
    this.plot.setupGrid();
    this.plot.draw();
}

function PlotData(frameLength, frameCount, defaultValues) {
    this.currentIndex = 0;
    this.frameLength = frameLength;
    this.frameCount = frameCount;
    if(defaultValues) {
        this.initData(defaultValues);
    }
}

PlotData.prototype.setFrameLength = function(frameLength) {
    this.frameLength = frameLength;
}

PlotData.prototype.setFrameCount = function(frameCount) {
    this.frameCount = frameCount;
}

PlotData.prototype.getFrameLength = function() {
    return this.frameLength;
}

PlotData.prototype.getFrameCount = function() {
    return this.frameCount;
}

PlotData.prototype.initData = function(defaultValues) {
    this.plotData = [];
    var self = this;
    this.frameData = [];
    defaultValues.forEach(function(defaultValue) {
        var tempData = [];
        for(self.currentIndex = 0; self.currentIndex < self.frameCount; self.currentIndex++) {
            tempData.push([self.currentIndex, defaultValue]);
        }
        self.plotData.push(tempData);
        self.frameData.push([]);
    });

}

PlotData.prototype.getMaxValues = function() {
    var maxValues = [];
    this.plotData.forEach(function(data) {
        maxValues.push(Math.max.apply(Math, data.map(function(o) {
            return o[1];
        })));
    });
    return maxValues;
}

PlotData.prototype.pushData = function(values) {
    var self = this;
    values.forEach(function(value, index) {
        self.frameData[index].push(value);
    });
    if(self.frameData[0].length === this.frameLength) {
        self.frameData.forEach(function(frameValues, index) {
            var avg = frameValues.reduce(function(a, b) {
                return a + b;
            }, 0) / self.frameLength;
            self.plotData[index].push([self.currentIndex, avg]);
            self.plotData[index].shift();
            frameValues.length = 0;
        });
        this.currentIndex++;
    }
}

PlotData.prototype.get = function() {
    return this.plotData;
}
