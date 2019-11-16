$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;
        self.settingsViewModel = parameters[0];

        self.currentIndex = 60;
        self.plotDataInitialized = false;

        self.cpuPlotData = null;
        self.averageCpuPlotData = null;

        var cpuOptions = {
            yaxis: {
                min: 0,
                max: 100,
                tickFormatter: function(value, axis) {
                    return value + "%";
                }
            },
            xaxis: {
                show: false
            }
        };

        self.onAfterTabChange = function(current, previous) {
            if(current === "#tab_plugin_resource_monitor") {
                self.cpuPlot = $.plot($("#resource-monitor-cpu"), [[]], cpuOptions);
            }
        };

        self.initializePlotData = function(message) {
            self.cpuPlotData = [];
            message.cpu.forEach(cpuUsage => {
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
                for(var i = 0; i < message.cpu.length; i++) {
                    self.cpuPlotData[i].push([self.currentIndex, message.cpu[i]]);
                    self.cpuPlotData[i].shift();
                }
                self.averageCpuPlotData[0].push([self.currentIndex, message.cpu.reduce((a, b) => a + b, 0) / message.cpu.length]);
                self.averageCpuPlotData[0].shift();
                self.currentIndex++;
                self.cpuPlot.setData(self.cpuPlotData);
                self.cpuPlot.setupGrid();
                self.cpuPlot.draw();
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
