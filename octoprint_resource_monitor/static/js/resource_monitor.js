$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;
        self.settingsViewModel = parameters[0];

        self.cpu = ko.observable();
        self.memory = ko.observable();
        self.partitions = ko.observableArray();

        self.currentPlotIndex = 60;

        self.miniCpuPlot = null;
        self.miniMemoryPlot = null;

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

        self.cpu.subscribe(function(newValue) {
            if(self.averageCpuPlotData === null) {
                var averageData = []
                for(var i = 0; i < self.currentPlotIndex; i++) {
                    averageData.push([i, 0]);
                }
                self.averageCpuPlotData = [averageData];
            }
            self.averageCpuPlotData[0].push([self.currentPlotIndex, newValue.average]);
            self.averageCpuPlotData[0].shift();
            if(self.miniCpuPlot != null) {
                self.miniCpuPlot.setData(self.averageCpuPlotData);
                self.miniCpuPlot.setupGrid();
                self.miniCpuPlot.draw();
            }
        });

        self.memory.subscribe(function(newValue) {
            if(self.memoryPlotData === null) {
                var memoryData = [];
                for(var i = 0; i < self.currentPlotIndex; i++) {
                    memoryData.push([i, 0]);
                }
                self.memoryPlotData = [memoryData];
            }
            self.memoryPlotData[0].push([self.currentPlotIndex, newValue.used]);
            self.memoryPlotData[0].shift();
            if(self.miniMemoryPlot != null) {
                self.miniMemoryPlot.getAxes().yaxis.options.max = newValue.total;
                self.miniMemoryPlot.setData(self.memoryPlotData);
                self.miniMemoryPlot.setupGrid();
                self.miniMemoryPlot.draw();
            }
        });
/*
        self.initializePlotData = function(message) {
            //Per core data
            self.cpuPlotData = [];
            message.cpu.cores.forEach(core => {
                var coreData = [];
                for(var i = 0; i < self.currentPlotIndex; i++) {
                    coreData.push([i, 0]);
                }
                self.cpuPlotData.push(coreData);
            });
            //Memory data
            //Sets initialized flag to true
            self.plotDataInitialized = true;
        };*/

        self.onAfterTabChange = function(current, previous) {
            if(current === "#tab_plugin_resource_monitor") {
                if(self.miniCpuPlot === null) {
                    self.miniCpuPlot = $.plot($("#resource-monitor-mini-cpu"), [[]], self.baseOptions);
                    self.miniCpuPlot.getAxes().yaxis.options.max = 100;
                }
                if(self.miniMemoryPlot === null) {
                    self.miniMemoryPlot = $.plot($("#resource-monitor-mini-memory"), [[]], self.baseOptions);
                }
            }
        };

        self.onDataUpdaterPluginMessage = function(plugin, message) {
            if(plugin == "resource_monitor") {
                /*if(!self.plotDataInitialized) {
                    self.initializePlotData(message);
                }
                //Per core usage
                for(var i = 0; i < message.cpu.cores.length; i++) {
                    self.cpuPlotData[i].push([self.currentPlotIndex, message.cpu.cores[i]]);
                    self.cpuPlotData[i].shift();
                }*/
                self.cpu(message.cpu);
                self.memory(message.memory);
                self.partitions(message.partitions);

                self.currentPlotIndex++;
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
