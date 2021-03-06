$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;

        self.settingsViewModel = parameters[0];

        self.frameCount = function() {
            var interval = self.settingsViewModel.settings.plugins.resource_monitor.refresh_rate();
            var duration = self.settingsViewModel.settings.plugins.resource_monitor.duration();
            return Math.ceil(duration / interval);
        };

        self.frameLength = function() {
            return self.settingsViewModel.settings.plugins.resource_monitor.refresh_rate();
        };

        self.cpu = ko.observable();
        self.temp = ko.observable();
        self.minTemp = ko.observable();
        self.maxTemp = ko.observable();
        self.memory = ko.observable();
        self.partitions = ko.observableArray();
        self.network = ko.observableArray();
        self.downloadSpeeds = ko.observableArray();
        self.uploadSpeeds = ko.observableArray();
        self.maxSpeeds = ko.observableArray();
        self.battery = ko.observable();

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

        self.averageCpuData = null;
        self.cpuCoreData = [];
        self.celsiusTempData = null;
        self.fahrenheitTempData = null;
        self.memoryData = null;
        self.diskData = [];
        self.networkData = [];
        self.batteryData = null;

        self.lastReceivedBytes = [];
        self.lastSentBytes = [];

        self.setPlotsData = function(plots, data, max, min) {
            plots.forEach(function(plot) {
                if(plot) {
                    if (max !== undefined) {
                        plot.setMax(max);
                    }
                    if (min !== undefined) {
                        plot.setMin(min);
                    }
                    plot.setData(data);
                }
            });
        }

        self.cpu.subscribe(function(newValue) {
            if(!self.averageCpuData) {
                self.averageCpuData = new PlotData(self.frameLength(), self.frameCount(), [0]);
            }
            if(self.cpuCoreData.length === 0) {
                newValue.cores.forEach(function() {
                    self.cpuCoreData.push(new PlotData(self.frameLength(), self.frameCount(), [0]));
                });
            }
            self.averageCpuData.pushData([newValue.average]);
            self.cpuCoreData.forEach(function(coreData, coreIndex) {
                coreData.pushData([newValue.cores[coreIndex]]);
            });
            self.setPlotsData([self.miniCpuPlot], self.averageCpuData);
            self.cpuCorePlots.forEach(function(cpuCorePlot, coreIndex) {
                self.setPlotsData([cpuCorePlot], self.cpuCoreData[coreIndex]);
            });
        });

        self.temp.subscribe(function(newValue) {
            var unit = self.settingsViewModel.settings.plugins.resource_monitor.temperature.unit();
            if(!self.celsiusTempData || !self.fahrenheitTempData) {
                self.celsiusTempData = new PlotData(self.frameLength(), self.frameCount(), [0]);
                self.fahrenheitTempData = new PlotData(self.frameLength(), self.frameCount(), [32]);
            }
            self.celsiusTempData.pushData([newValue.celsius.current]);
            self.fahrenheitTempData.pushData([newValue.fahrenheit.current]);
            if(unit === "celsius") {
                self.setPlotsData([self.miniTempPlot, self.tempPlot], self.celsiusTempData, 100, 0);
                self.minTemp("0 °C");
                self.maxTemp("100 °C");
            } else if(unit === "fahrenheit") {
                self.setPlotsData([self.miniTempPlot, self.tempPlot], self.fahrenheitTempData, 212, 32);
                self.minTemp("32 °F");
                self.maxTemp("212 °F");
            }
        });

        self.memory.subscribe(function(newValue) {
            if(!self.memoryData) {
                self.memoryData = new PlotData(self.frameLength(), self.frameCount(), [0]);
            }
            self.memoryData.pushData([newValue.used]);
            self.setPlotsData([self.miniMemoryPlot, self.memoryPlot], self.memoryData, newValue.total);
        });

        self.partitions.subscribe(function(newValue) {
            if(self.diskData.length === 0) {
                newValue.forEach(function() {
                    self.diskData.push(new PlotData(self.frameLength(), self.frameCount(), [0]));
                });
            }
            self.diskData.forEach(function(disk, diskIndex) {
                disk.pushData([newValue[diskIndex].used]);
                self.setPlotsData([self.miniPartitionPlots[diskIndex], self.partitionPlots[diskIndex]], disk, newValue[diskIndex].total);
            });
        });

        self.network.subscribe(function(newValue) {
            if(self.networkData.length === 0) {
                newValue.forEach(function() {
                    self.networkData.push(new PlotData(self.frameLength(), self.frameCount(), [0, 0]));
                });
            }
            var uploadSpeeds = [];
            var downloadSpeeds = [];
            var maxSpeeds = [];
            self.networkData.forEach(function(network, networkIndex) {
                var download = 0;
                var upload = 0;
                if(self.lastSentBytes[networkIndex] !== undefined && self.lastReceivedBytes[networkIndex] !== undefined) {
                    download = newValue[networkIndex].bytes_recv - self.lastReceivedBytes[networkIndex];
                    upload = newValue[networkIndex].bytes_sent - self.lastSentBytes[networkIndex];
                }
                uploadSpeeds.push(upload);
                downloadSpeeds.push(download);
                var maxSpeed = 0;
                network.pushData([download, upload]);
                self.setPlotsData([self.miniNetworkPlots[networkIndex]], network);
                var networkPlot = self.networkPlots[networkIndex];
                if(networkPlot) {
                    networkPlot.setData(network, [gettext("Download"), gettext("Upload")]);
                    maxSpeed = networkPlot.plot.getAxes().yaxis.max;
                }
                maxSpeeds.push(maxSpeed);
                self.lastReceivedBytes[networkIndex] = newValue[networkIndex].bytes_recv;
                self.lastSentBytes[networkIndex] = newValue[networkIndex].bytes_sent;
            });
            self.downloadSpeeds(downloadSpeeds);
            self.uploadSpeeds(uploadSpeeds);
            self.maxSpeeds(maxSpeeds);
        });

        self.battery.subscribe(function(newValue) {
            if(!self.batteryData) {
                self.batteryData = new PlotData(self.frameLength(), self.frameCount(), [0]);
            }
            self.batteryData.pushData([newValue.percent]);
            self.setPlotsData([self.miniBatteryPlot, self.batteryPlot], self.batteryData);
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
                    self.tempPlot = new ResourcePlot(tabId + " .detail-plot", false, false);
                }
            } else if (tabId === "#resource_monitor_memory_tab") {
                if(self.memoryPlot === null) {
                    self.memoryPlot = new ResourcePlot(tabId + " .detail-plot", false, false);
                }
            } else if (tabId === "#resource_monitor_battery_tab") {
                if(self.batteryPlot === null) {
                    self.batteryPlot = new ResourcePlot(tabId + " .detail-plot", false, false, 100);
                }
            } else if (tabId.includes("#resource_monitor_disk_")) {
                index = parseInt($(e.target).attr("data-index"));
                if(self.partitionPlots[index] === undefined) {
                    self.partitionPlots[index] = new ResourcePlot(tabId + " .detail-plot", false, false);
                }
            } else if (tabId.includes("#resource_monitor_network_")) {
                index = parseInt($(e.target).attr("data-index"));
                if(self.networkPlots[index] === undefined) {
                    self.networkPlots[index] = new ResourcePlot(tabId + " .detail-plot", false, true);
                }
            }
        });

        self.onAfterTabChange = function(current) {
            if(current === "#tab_plugin_resource_monitor") {
                if(self.miniCpuPlot === null) {
                    self.miniCpuPlot = new ResourcePlot("#resource-monitor-mini-cpu", true, false, 100);
                }
                if(self.miniTempPlot === null) {
                    self.miniTempPlot = new ResourcePlot("#resource-monitor-mini-temp", true, false);
                }
                if(self.miniMemoryPlot === null) {
                    self.miniMemoryPlot = new ResourcePlot("#resource-monitor-mini-memory", true, false);
                }
                if(self.miniBatteryPlot === null) {
                    self.miniBatteryPlot = new ResourcePlot("#resource-monitor-mini-battery", true, false, 100);
                }
                if(self.miniPartitionPlots.length === 0) {
                    $("div.resource-monitor-mini-partition-plot").each(function() {
                        self.miniPartitionPlots.push(new ResourcePlot(this, true, false));
                    });
                }
                if(self.miniNetworkPlots.length === 0) {
                    $("div.resource-monitor-mini-network-plot").each(function() {
                        self.miniNetworkPlots.push(new ResourcePlot(this, true, true));
                    });
                }
                if(self.cpuCorePlots.length === 0) {
                    $("#resource_monitor_cpu_tab .detail-plot").each(function() {
                        self.cpuCorePlots.push(new ResourcePlot(this, false, false, 100));
                    });
                }
            }
        };

        self.onDataUpdaterPluginMessage = function(plugin, message) {
            if(plugin === "resource_monitor") {
                self.cpu(message.cpu);
                self.temp(message.temp);
                self.memory(message.memory);
                self.partitions(message.partitions);
                self.network(message.network);
                self.battery(message.battery);
            }
        };

        self.setupPlotDataIfNeeded = function(plotDatas, defaultValues) {
            var changed = false;
            var newFrameCount = self.frameCount();
            var newFrameLength = self.frameLength();
            if(newFrameLength > 0) {
                plotDatas.forEach(function (plotData) {
                    if(plotData) {
                        if (plotData.getFrameCount() !== newFrameCount) {
                            plotData.setFrameCount(newFrameCount);
                            changed = true;
                        }
                        if (plotData.getFrameLength() !== newFrameLength) {
                            plotData.setFrameLength(newFrameLength);
                            changed = true;
                        }
                        if (changed) {
                            plotData.initData(defaultValues);
                        }
                    }
                });
            }
        };

        self.onSettingsBeforeSave = function() {
            var refreshRate = parseInt(self.settingsViewModel.settings.plugins.resource_monitor.refresh_rate());
            if(refreshRate < 1) {
                refreshRate = 1;
            }
            var duration = parseInt(self.settingsViewModel.settings.plugins.resource_monitor.duration());
            if(duration < 1) {
                duration = 1;
            }
            self.settingsViewModel.settings.plugins.resource_monitor.refresh_rate(refreshRate);
            self.settingsViewModel.settings.plugins.resource_monitor.duration(duration);
            self.setupPlotDataIfNeeded([self.averageCpuData], [0]);
            self.setupPlotDataIfNeeded([self.memoryData], [0]);
            self.setupPlotDataIfNeeded(self.cpuCoreData, [0]);
            self.setupPlotDataIfNeeded([self.celsiusTempData], [0]);
            self.setupPlotDataIfNeeded([self.fahrenheitTempData], [32]);
            self.setupPlotDataIfNeeded([self.memoryData], [0]);
            self.setupPlotDataIfNeeded(self.diskData, [0]);
            self.setupPlotDataIfNeeded(self.networkData, [0, 0]);
            self.setupPlotDataIfNeeded([self.batteryData], [0]);
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
