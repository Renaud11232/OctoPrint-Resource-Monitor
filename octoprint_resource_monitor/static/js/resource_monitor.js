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
        self.miniPartitionPlots = [];

        self.averageCpuPlotData = null;
        self.memoryPlotData = null;
        self.partitionPlotData = [];

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

        self.partitions.subscribe(function(newValue) {
            if(self.partitionPlotData.length === 0) {
                newValue.forEach(function(partition, partitionI) {
                    var partitionData = [];
                    for(var i = 0; i < self.currentPlotIndex; i++) {
                        partitionData.push([i, newValue[partitionI].used]);
                    }
                    self.partitionPlotData.push([partitionData]);
                });
            }
            self.partitionPlotData.forEach(function(partPlotData, partitionI) {
                partPlotData[0].push([self.currentPlotIndex, newValue[partitionI].used]);
                partPlotData[0].shift();
            });
            if(self.miniPartitionPlots.length != 0) {
                self.miniPartitionPlots.forEach(function(plot, index) {
                    plot.getAxes().yaxis.options.max = newValue[index].total;
                    plot.setData(self.partitionPlotData[index]);
                    plot.setupGrid();
                    plot.draw();
                });
            }
        });

        self.onAfterTabChange = function(current, previous) {
            if(current === "#tab_plugin_resource_monitor") {
                if(self.miniCpuPlot === null) {
                    self.miniCpuPlot = $.plot($("#resource-monitor-mini-cpu"), [[]], self.baseOptions);
                    self.miniCpuPlot.getAxes().yaxis.options.max = 100;
                }
                if(self.miniMemoryPlot === null) {
                    self.miniMemoryPlot = $.plot($("#resource-monitor-mini-memory"), [[]], self.baseOptions);
                }
                if(self.miniPartitionPlots.length === 0) {
                    $("div.resource-monitor-mini-partition-plot").each(function() {
                        self.miniPartitionPlots.push($.plot($(this), [[]], self.baseOptions));
                    });
                }
            }
        };

        self.onDataUpdaterPluginMessage = function(plugin, message) {
            if(plugin == "resource_monitor") {
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
