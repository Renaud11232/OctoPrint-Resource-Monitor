$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;
        self.settingsViewModel = parameters[0];

        self.cpuPercent = ko.observable();

        self.currentIndex = 60;
        self.plotDataInitialized = false;

        self.miniCpuPlot = null;

        //self.cpuPlot = null;
        //self.averageCpuPlot = null;

        self.cpuPlotData = null;
        self.averageCpuPlotData = null;

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

        var cpuMiniOptions = {
            yaxis: {
                min: 0,
                max: 100,
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
                    self.miniCpuPlot = $.plot($("#resource-monitor-mini-cpu"), [[]], cpuMiniOptions);
                    self.updateMiniCpuPlot();
                }
            }
        };

        self.initializePlotData = function(message) {
            self.cpuPlotData = [];
            message.cpu.cores.forEach(core => {
                var coreData = [];
                for(var i = 0; i < self.currentIndex; i++) {
                    coreData.push([i, 0]);
                }
                self.cpuPlotData.push(coreData);
            });
            var averageData = []
            for(var i = 0; i < self.currentIndex; i++) {
                averageData.push([i, 0]);
            }
            self.averageCpuPlotData = [averageData];
            self.plotDataInitialized = true;
        };

        self.onDataUpdaterPluginMessage = function(plugin, message) {
            if(plugin == "resource_monitor") {
                if(!self.plotDataInitialized) {
                    self.initializePlotData(message);
                }
                for(var i = 0; i < message.cpu.cores.length; i++) {
                    self.cpuPlotData[i].push([self.currentIndex, message.cpu.cores[i]]);
                    self.cpuPlotData[i].shift();
                }
                self.cpuPercent(Math.round(message.cpu.average));
                self.averageCpuPlotData[0].push([self.currentIndex, message.cpu.average]);
                self.averageCpuPlotData[0].shift();
                self.currentIndex++;
                //self.updateCpuPlot();
                //self.updateAverageCpuPlot();
                self.updateMiniCpuPlot();
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
