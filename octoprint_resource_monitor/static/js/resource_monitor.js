$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;
        self.settingsViewModel = parameters[0];

        self.cpu = ko.observable();
        self.memory = ko.observable();
        self.partitions = ko.observableArray();
        self.network = ko.observableArray();

        self.currentPlotIndex = 60;

        self.miniCpuPlot = null;
        self.miniMemoryPlot = null;
        self.miniPartitionPlots = [];
        self.miniNetworkPlots = [];

        self.averageCpuPlotData = null;
        self.memoryPlotData = null;
        self.partitionPlotData = [];
        self.networkPlotData = [];

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
                    fill: 0.1
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

        self.network.subscribe(function(newValue) {
            if(self.networkPlotData.length === 0) {
                newValue.forEach(function(network, networkIndex) {
                    var downloadData = [];
                    var uploadData = [];
                    for(var i = 0; i < self.currentPlotIndex; i++) {
                        downloadData.push([i, 0]);
                        uploadData.push([i, 0]);
                    }
                    self.networkPlotData.push([downloadData, uploadData]);
                });
            }
            // TODO update the data here
            if(self.miniNetworkPlots.length != 0) {
                self.miniNetworkPlots.forEach(function(plot, index) {
                    plot.setData(self.networkPlotData[index]);
                    plot.setupGrid();
                    plot.draw();
                });
            }
        });

        //Hacky way of supporting Themeify
        new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if(mutation.attributeName === "class") {
                    $("div.resource-monitor-mini-plot").css("background-color", $("body").css("background-color"));
                }
            });
        }).observe($("html")[0], {
            attributes: true
        });

        $('#tab_plugin_resource_monitor a[data-toggle="tab"]').on("shown", function(e) {
            var tabId = $(e.target).attr("href");
            // TODO initialize plots and whatnots
            if (tabId === "#resource_monitor_memory_tab") {
                console.log("TODO : init memory plot");
            } else if (tabId.includes("#resource_monitor_disk_")) {
                var index = parseInt($(e.target).attr("data-index"));
                console.log("TODO : init disk " + index +" plot");
            } else if (tabId.includes("#resource_monitor_network_")) {
                var index = parseInt($(e.target).attr("data-index"));
                console.log("TODO : init network " + index +" plot");
            }
        });

        self.onAfterTabChange = function(current, previous) {
            if(current === "#tab_plugin_resource_monitor") {
                if(self.miniCpuPlot === null) {
                    self.miniCpuPlot = $.plot($("#resource-monitor-mini-cpu"), [[]], self.baseOptions);
                    self.miniCpuPlot.getAxes().yaxis.options.max = 100;
                    self.miniCpuPlot.getOptions().colors = ["#117dbb"];
                    self.miniCpuPlot.getOptions().grid.borderColor = "#117dbb";
                }
                if(self.miniMemoryPlot === null) {
                    self.miniMemoryPlot = $.plot($("#resource-monitor-mini-memory"), [[]], self.baseOptions);
                    self.miniMemoryPlot.getOptions().colors = ["#8b12ae"];
                    self.miniMemoryPlot.getOptions().grid.borderColor = "#8b12ae";
                }
                if(self.miniPartitionPlots.length === 0) {
                    $("div.resource-monitor-mini-partition-plot").each(function() {
                        var plot = $.plot($(this), [[]], self.baseOptions);
                        plot.getOptions().colors = ["#4da60c"];
                        plot.getOptions().grid.borderColor = "#4da60c";
                        self.miniPartitionPlots.push(plot);
                    });
                }
                if(self.miniNetworkPlots.length === 0) {
                    $("div.resource-monitor-mini-network-plot").each(function() {
                        var plot = $.plot($(this), [[]], self.baseOptions);
                        plot.getOptions().colors = ["#a74f01"];
                        plot.getOptions().grid.borderColor = "#a74f01";
                        self.miniNetworkPlots.push(plot);
                    });
                }
            }
        };

        self.onDataUpdaterPluginMessage = function(plugin, message) {
            if(plugin == "resource_monitor") {
                self.cpu(message.cpu);
                self.memory(message.memory);
                self.partitions(message.partitions);
                self.network(message.network);

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
