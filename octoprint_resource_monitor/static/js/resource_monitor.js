$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;

        self.settingsViewModel = parameters[0];

        self.cpu = ko.observable();
        self.temp = ko.observable();
        self.memory = ko.observable();
        self.partitions = ko.observableArray();
        self.network = ko.observableArray();
        self.downloadSpeeds = ko.observableArray();
        self.uploadSpeeds = ko.observableArray();
        self.battery = ko.observable();

        self.currentPlotIndex = 60;

        self.miniCpuPlot = null;
        self.cpuCorePlots = [];
        self.miniTempPlot = null;
        self.tempPlot = null;
        self.miniMemoryPlot = null;
        self.memoryPlot = null;
        self.miniPartitionPlots = [];
        self.partitionPlots = [];
        self.miniNetworkPlots = [];
        self.networkPlots = [];
        self.miniBatteryPlot = null;
        self.batteryPlot = null;

        self.averageCpuPlotData = null;
        self.cpuCorePlotData = [];
        self.celsiusPlotData = null;
        self.fahrenheitPlotData = null;
        self.memoryPlotData = null;
        self.partitionPlotData = [];
        self.networkPlotData = [];
        self.lastSentBytes = [];
        self.lastReceivedBytes = [];
        self.batteryPlotData = null;

        self.baseOptions =  {
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
                tickSize: 10
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
        };

        self.cpu.subscribe(function(newValue) {
            if(self.averageCpuPlotData === null) {
                var averageData = []
                for(var i = 0; i < self.currentPlotIndex; i++) {
                    averageData.push([i, 0]);
                }
                self.averageCpuPlotData = [averageData];
            }
            if(self.cpuCorePlotData.length === 0) {
                newValue.cores.forEach(function() {
                    var coreData = [];
                    for(var i = 0; i < self.currentPlotIndex; i++) {
                        coreData.push([i, 0]);
                    }
                    self.cpuCorePlotData.push([coreData]);
                });
            }
            self.averageCpuPlotData[0].push([self.currentPlotIndex, newValue.average]);
            self.averageCpuPlotData[0].shift();
            self.cpuCorePlotData.forEach(function(coreData, coreIndex) {
                coreData[0].push([self.currentPlotIndex, newValue.cores[coreIndex]]);
                coreData[0].shift();
            });
            if(self.miniCpuPlot != null) {
                self.miniCpuPlot.setData(self.averageCpuPlotData);
                self.miniCpuPlot.setupGrid();
                self.miniCpuPlot.draw();
            }
            self.cpuCorePlots.forEach(function(corePlot, coreIndex) {
                corePlot.setData(self.cpuCorePlotData[coreIndex]);
                corePlot.setupGrid();
                corePlot.draw();
            });
        });

        self.temp.subscribe(function(newValue) {
            if(self.celsiusPlotData === null || self.fahrenheitPlotData === null) {
                var tempCelsiusData = [];
                var tempsFahrenheitData = [];
                for(var i = 0; i < self.currentPlotIndex; i++) {
                    tempCelsiusData.push([i, 0]);
                    tempsFahrenheitData.push([i, 32]);
                }
                self.celsiusPlotData = [tempCelsiusData];
                self.fahrenheitPlotData = [tempsFahrenheitData];
            }
            self.celsiusPlotData[0].push([self.currentPlotIndex, newValue.celsius.current]);
            self.fahrenheitPlotData[0].push([self.currentPlotIndex, newValue.fahrenheit.current]);
            self.celsiusPlotData[0].shift();
            self.fahrenheitPlotData[0].shift();
            var unit = self.settingsViewModel.settings.plugins.resource_monitor.temperature.unit();
            if(self.miniTempPlot != null) {
                if(unit === "celsius") {
                    self.miniTempPlot.setData(self.celsiusPlotData);
                    self.miniTempPlot.getAxes().yaxis.options.max = 100;
                    self.miniTempPlot.getAxes().yaxis.options.min = 0;
                } else if (unit === "fahrenheit") {
                    self.miniTempPlot.setData(self.fahrenheitPlotData);
                    self.miniTempPlot.getAxes().yaxis.options.max = 212;
                    self.miniTempPlot.getAxes().yaxis.options.min = 32;
                }
                self.miniTempPlot.setupGrid();
                self.miniTempPlot.draw();
            }
            if(self.tempPlot != null) {
                if(unit === "celsius") {
                    self.tempPlot.setData(self.celsiusPlotData);
                    self.tempPlot.getAxes().yaxis.options.max = 100;
                    self.tempPlot.getAxes().yaxis.options.min = 0;
                } else if (unit === "fahrenheit") {
                    self.tempPlot.setData(self.fahrenheitPlotData);
                    self.tempPlot.getAxes().yaxis.options.max = 212;
                    self.tempPlot.getAxes().yaxis.options.min = 32;
                }
                self.tempPlot.setupGrid();
                self.tempPlot.draw();
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
            if(self.memoryPlot != null) {
                self.memoryPlot.getAxes().yaxis.options.max = newValue.total;
                self.memoryPlot.getAxes().yaxis.options.tickSize = newValue.total / 10;
                self.memoryPlot.setData(self.memoryPlotData);
                self.memoryPlot.setupGrid();
                self.memoryPlot.draw();
            }
        });

        self.battery.subscribe(function(newValue) {
            if(self.batteryPlotData === null) {
                var batteryData = [];
                for(var i = 0; i < self.currentPlotIndex; i++) {
                    batteryData.push([i, 0]);
                }
                self.batteryPlotData = [batteryData];
            }
            self.batteryPlotData[0].push([self.currentPlotIndex, newValue.percent]);
            self.batteryPlotData[0].shift();
            if(self.miniBatteryPlot != null) {
                self.miniBatteryPlot.setData(self.batteryPlotData);
                self.miniBatteryPlot.setupGrid();
                self.miniBatteryPlot.draw();
            }
            if(self.batteryPlot != null) {
                self.batteryPlot.setData(self.batteryPlotData);
                self.batteryPlot.setupGrid();
                self.batteryPlot.draw();
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
            self.miniPartitionPlots.forEach(function(plot, index) {
                plot.getAxes().yaxis.options.max = newValue[index].total;
                plot.setData(self.partitionPlotData[index]);
                plot.setupGrid();
                plot.draw();
            });
            self.partitionPlots.forEach(function(plot, index) {
                plot.getAxes().yaxis.options.max = newValue[index].total;
                plot.getAxes().yaxis.options.tickSize = newValue[index].total / 10;
                plot.setData(self.partitionPlotData[index]);
                plot.setupGrid();
                plot.draw();
            });
        });

        self.network.subscribe(function(newValue) {
            if(self.networkPlotData.length === 0) {
                newValue.forEach(function() {
                    var downloadData = [];
                    var uploadData = [];
                    for(var i = 0; i < self.currentPlotIndex; i++) {
                        downloadData.push([i, 0]);
                        uploadData.push([i, 0]);
                    }
                    self.networkPlotData.push([downloadData, uploadData]);
                });
            }
            if(self.lastSentBytes.length === 0 || self.lastReceivedBytes.length === 0) {
                newValue.forEach(function() {
                    self.lastSentBytes.push(0);
                    self.lastReceivedBytes.push(0);
                });
            }
            var downloadSpeeds = [];
            var uploadSpeeds = [];
            self.networkPlotData.forEach(function(networkData, networkIndex) {
                if(self.lastReceivedBytes[networkIndex] !== 0 && self.lastSentBytes[networkIndex] !== 0 ) {
                    var download = newValue[networkIndex].bytes_recv - self.lastReceivedBytes[networkIndex];
                    var upload = newValue[networkIndex].bytes_sent - self.lastSentBytes[networkIndex];
                    networkData[0].push([self.currentPlotIndex, download]);
                    networkData[1].push([self.currentPlotIndex, upload]);
                    networkData[0].shift();
                    networkData[1].shift();
                    downloadSpeeds.push(download);
                    uploadSpeeds.push(upload);
                } else {
                    networkData[0].push([self.currentPlotIndex, 0]);
                    networkData[1].push([self.currentPlotIndex, 0]);
                    networkData[0].shift();
                    networkData[1].shift();
                    downloadSpeeds.push(0);
                    uploadSpeeds.push(0);
                }
                self.lastReceivedBytes[networkIndex] = newValue[networkIndex].bytes_recv;
                self.lastSentBytes[networkIndex] = newValue[networkIndex].bytes_sent;
            });
            self.downloadSpeeds(downloadSpeeds);
            self.uploadSpeeds(uploadSpeeds);
            self.miniNetworkPlots.forEach(function(plot, index) {
                plot.setData(self.networkPlotData[index]);
                plot.setupGrid();
                plot.draw();
            });
            self.networkPlots.forEach(function(plot, index) {
                var maxDownload = Math.max.apply(Math, self.networkPlotData[index][0].map(function(o) {
                    return o[1];
                }));
                var maxUpload = Math.max.apply(Math, self.networkPlotData[index][1].map(function(o) {
                    return o[1];
                }));
                plot.getAxes().yaxis.options.tickSize = Math.max(maxDownload, maxUpload) / 10;
                plot.getAxes().yaxis.options.max = Math.max(maxDownload, maxUpload);
                plot.setData([
                    {
                        data: self.networkPlotData[index][0],
                        label: gettext("Download")
                    },
                    {
                        data: self.networkPlotData[index][1],
                        label: gettext("Upload")
                    }
                ]);
                plot.setupGrid();
                plot.draw();
            });
        });

        self.twoDigits = function(value) {
            return (value > 9 ? "" : "0") + value;
        }

        self.formatSeconds = function(uptime) {
            var seconds = uptime % 60;
            var minutes = Math.floor(uptime / 60) % 60;
            var hours = Math.floor(uptime / 3600) % 24;
            var days = Math.floor(uptime / (3600 * 24));
            var formatted = self.twoDigits(hours) + ":" + self.twoDigits(minutes) + ":" + self.twoDigits(seconds);
            if(days > 0) {
                formatted = days + ":" + formatted;
            }
            return formatted;
        };

        //Hacky way of supporting Themeify
        new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if(mutation.attributeName === "class") {
                    $("#tab_plugin_resource_monitor .mini-plot").css("background-color", $("body").css("background-color"));
                }
            });
        }).observe($("html")[0], {
            attributes: true
        });

        $('#tab_plugin_resource_monitor a[data-toggle="tab"]').on("shown", function(e) {
            var tabId = $(e.target).attr("href");
            var index;
            if (tabId === "#resource_monitor_temp_tab") {
                if(self.tempPlot === null) {
                    self.tempPlot = $.plot($(tabId + " .detail-plot"), [[]], self.baseOptions);
                    self.tempPlot.getAxes().xaxis.options.show = true;
                    self.tempPlot.getAxes().yaxis.options.show = true;
                }
            } else if (tabId === "#resource_monitor_memory_tab") {
                if(self.memoryPlot === null) {
                    self.memoryPlot = $.plot($(tabId + " .detail-plot"), [[]], self.baseOptions);
                    self.memoryPlot.getAxes().xaxis.options.show = true;
                    self.memoryPlot.getAxes().yaxis.options.show = true;
                }
            } else if (tabId === "#resource_monitor_battery_tab") {
                if(self.batteryPlot === null) {
                    self.batteryPlot = $.plot($(tabId + " .detail-plot"), [[]], self.baseOptions);
                    self.batteryPlot.getAxes().xaxis.options.show = true;
                    self.batteryPlot.getAxes().yaxis.options.show = true;
                    self.batteryPlot.getAxes().yaxis.options.max = 100;
                }
            } else if (tabId.includes("#resource_monitor_disk_")) {
                index = parseInt($(e.target).attr("data-index"));
                if(self.partitionPlots[index] === undefined) {
                    self.partitionPlots[index] = $.plot($(tabId + " .detail-plot"), [[]], self.baseOptions);
                    self.partitionPlots[index].getAxes().xaxis.options.show = true;
                    self.partitionPlots[index].getAxes().yaxis.options.show = true;
                }
            } else if (tabId.includes("#resource_monitor_network_")) {
                index = parseInt($(e.target).attr("data-index"));
                if(self.networkPlots[index] === undefined) {
                    self.networkPlots[index] = $.plot($(tabId + " .detail-plot"), [[]], self.baseOptions);
                    self.networkPlots[index].getAxes().xaxis.options.show = true;
                    self.networkPlots[index].getAxes().yaxis.options.show = true;
                }
            }
        });

        self.onAfterTabChange = function(current) {
            if(current === "#tab_plugin_resource_monitor") {
                if(self.miniCpuPlot === null) {
                    self.miniCpuPlot = $.plot($("#resource-monitor-mini-cpu"), [[]], self.baseOptions);
                    self.miniCpuPlot.getAxes().yaxis.options.max = 100;
                }
                if(self.miniTempPlot === null) {
                    self.miniTempPlot = $.plot($("#resource-monitor-mini-temp"), [[]], self.baseOptions);
                }
                if(self.miniMemoryPlot === null) {
                    self.miniMemoryPlot = $.plot($("#resource-monitor-mini-memory"), [[]], self.baseOptions);
                }
                if(self.miniBatteryPlot === null) {
                    self.miniBatteryPlot = $.plot($("#resource-monitor-mini-battery"), [[]], self.baseOptions);
                    self.miniBatteryPlot.getAxes().yaxis.options.max = 100;
                }
                if(self.miniPartitionPlots.length === 0) {
                    $("div.resource-monitor-mini-partition-plot").each(function() {
                        self.miniPartitionPlots.push($.plot($(this), [[]], self.baseOptions));
                    });
                }
                if(self.miniNetworkPlots.length === 0) {
                    $("div.resource-monitor-mini-network-plot").each(function() {
                        self.miniNetworkPlots.push($.plot($(this), [[]], self.baseOptions));
                    });
                }
                if(self.cpuCorePlots.length === 0) {
                    $("#resource_monitor_cpu_tab .detail-plot").each(function() {
                        var plot = $.plot($(this), [[]], self.baseOptions);
                        plot.getAxes().yaxis.options.max = 100;
                        plot.getAxes().xaxis.options.show = true;
                        plot.getAxes().yaxis.options.show = true;
                        plot.getAxes().yaxis.options.tickSize = 10;
                        self.cpuCorePlots.push(plot);
                    });
                }
            }
        };

        self.onDataUpdaterPluginMessage = function(plugin, message) {
            if(plugin === "resource_monitor") {
                self.cpu(message.cpu);
                self.memory(message.memory);
                self.partitions(message.partitions);
                self.network(message.network);
                self.temp(message.temp);
                self.battery(message.battery);

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
            "#tab_plugin_resource_monitor",
            "#settings_plugin_resource_monitor"
        ]
    });
});
