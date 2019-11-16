$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;
        self.settingsViewModel = parameters[0];

        self.cpuPercent = ko.observable();
        self.cpuFrequency = ko.observable();

        self.memoryUsed = ko.observable();
        self.memoryTotal = ko.observable();
        self.memoryUnit = ko.observable();
        self.memoryPercent = ko.observable();

        self.currentIndex = 60;
        self.plotDataInitialized = false;

        self.miniCpuPlot = null;
        self.miniMemoryPlot = null;

        //self.cpuPlot = null;
        //self.averageCpuPlot = null;

        self.cpuPlotData = null;
        self.averageCpuPlotData = null;

        self.memoryPlotData = null;

        self.baseOptions =  {
            yaxis: {
                min: 0,
                show: false
            },
            xaxis: {
                show: false
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
                minBorderMargin: 0
            }
        };

        /*var cpuOptions = {
            yaxis: {
                min: 0,
                max: 100,
                tickFormatter: function(value, axis) {
                    return value + "%";
                }
            },
            xaxis: {
                show: false
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
                minBorderMargin: 0
            }
        };*/

        /*self.updateCpuPlot = function() {
                if(self.plotDataInitialized && self.cpuPlot != null) {
                    self.cpuPlot.setData(self.cpuPlotData);
                    self.cpuPlot.setupGrid();
                    self.cpuPlot.draw();
                }
        };*/

        /*self.updateAverageCpuPlot = function() {
                if(self.plotDataInitialized && self.averageCpuPlot != null) {
                    self.averageCpuPlot.setData(self.averageCpuPlotData);
                    self.averageCpuPlot.setupGrid();
                    self.averageCpuPlot.draw();
                }
        };*/

        self.updateMiniCpuPlot = function() {
                if(self.plotDataInitialized && self.miniCpuPlot != null) {
                    self.miniCpuPlot.setData(self.averageCpuPlotData);
                    self.miniCpuPlot.setupGrid();
                    self.miniCpuPlot.draw();
                }
        };

        self.updateMiniMemoryPlot = function() {
                if(self.plotDataInitialized && self.miniMemoryPlot != null) {
                    self.miniMemoryPlot.setData(self.memoryPlotData);
                    self.miniMemoryPlot.setupGrid();
                    self.miniMemoryPlot.draw();
                }
        };

        self.onAfterTabChange = function(current, previous) {
            if(current === "#tab_plugin_resource_monitor") {
                /*if(self.cpuPlot === null) {
                    self.cpuPlot = $.plot($("#resource-monitor-cpu"), [[]], cpuOptions);
                    self.updateCpuPlot();
                }*/
                /*if(self.averageCpuPlot === null) {
                    self.averageCpuPlot = $.plot($("#resource-monitor-cpu-average"), [[]], cpuOptions);
                    self.updateAverageCpuPlot();
                }*/
                if(self.miniCpuPlot === null) {
                    self.miniCpuPlot = $.plot($("#resource-monitor-mini-cpu"), [[]], self.baseOptions);
                    self.miniCpuPlot.getAxes().yaxis.options.max = 100;
                    self.updateMiniCpuPlot();
                }
                if(self.miniMemoryPlot === null) {
                    self.miniMemoryPlot = $.plot($("#resource-monitor-mini-memory"), [[]], self.baseOptions);
                    self.updateMiniMemoryPlot();
                }
            }
        };

        self.initializePlots = function(message) {
            //Per core data
            self.cpuPlotData = [];
            message.cpu.cores.forEach(core => {
                var coreData = [];
                for(var i = 0; i < self.currentIndex; i++) {
                    coreData.push([i, 0]);
                }
                self.cpuPlotData.push(coreData);
            });
            //Average cpu date
            var averageData = []
            for(var i = 0; i < self.currentIndex; i++) {
                averageData.push([i, 0]);
            }
            self.averageCpuPlotData = [averageData];
            //Memory data
            self.miniMemoryPlot.getAxes().yaxis.options.max = message.memory.total;
            var memoryData = [];
            for(var i = 0; i < self.currentIndex; i++) {
                memoryData.push([i, 0]);
            }
            self.memoryPlotData = [memoryData];
            //Sets initialized flag to true
            self.plotDataInitialized = true;
        };

        self.onDataUpdaterPluginMessage = function(plugin, message) {
            if(plugin == "resource_monitor") {
                if(!self.plotDataInitialized) {
                    self.initializePlots(message);
                }
                //Per core usage
                for(var i = 0; i < message.cpu.cores.length; i++) {
                    self.cpuPlotData[i].push([self.currentIndex, message.cpu.cores[i]]);
                    self.cpuPlotData[i].shift();
                }
                //Total cpu usage
                self.cpuFrequency((message.cpu.frequency.current / 1000).toFixed(2));
                self.cpuPercent(Math.round(message.cpu.average));
                self.averageCpuPlotData[0].push([self.currentIndex, message.cpu.average]);
                self.averageCpuPlotData[0].shift();
                self.updateMiniCpuPlot();
                //Memory usage
                var exponent = filesize(message.memory.total, {output: "exponent"});
                var size = filesize(message.memory.total, {output: "object", exponent: exponent});
                self.memoryUnit(size.symbol);
                self.memoryTotal(Math.round(size.value.toFixed(1)));
                self.memoryUsed(filesize(message.memory.used, {output: "object", exponent: exponent}).value.toFixed(1));
                self.memoryPercent(Math.round((message.memory.used / message.memory.total) * 100))
                self.memoryPlotData[0].push([self.currentIndex, message.memory.used]);
                self.memoryPlotData[0].shift();
                self.updateMiniMemoryPlot();

                self.currentIndex++;
                //self.updateCpuPlot();
                //self.updateAverageCpuPlot();
            }
        };
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: ResourceMonitorViewModel,
        dependencies: [
            "settingsViewModel"
        ],
        elements: [
            "#tab_plugin_resource_monitor"
        ]
    });
});
