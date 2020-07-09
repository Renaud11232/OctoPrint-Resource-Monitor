# coding=utf-8
from __future__ import absolute_import

import psutil
import octoprint.plugin
from octoprint.util import RepeatedTimer


class ResourceMonitorPlugin(octoprint.plugin.SettingsPlugin,
							octoprint.plugin.StartupPlugin,
							octoprint.plugin.AssetPlugin,
							octoprint.plugin.TemplatePlugin):

	def get_settings_defaults(self):
		return dict(
			network=dict(
				exceptions=[]
			),
			disk=dict(
				exceptions=[]
			)
		)

	def get_settings_version(self):
		return 1

	def on_settings_initialized(self):
		self.__network_exceptions = self._settings.get(["network", "exceptions"])
		self.__disk_exceptions = self._settings.get(["disk", "exceptions"])

	def interval(self):
		return 1

	def check_resources(self):
		message = dict(
			cpu=self.get_cpu(),
			temp=self.get_cpu_temp(),
			memory=psutil.virtual_memory()._asdict(),
			partitions=self.get_partitions(all=False),
			network=self.get_network(all=False),
			battery=self.get_battery()
		)
		self._plugin_manager.send_plugin_message(self._identifier, message)

	def on_after_startup(self):
		RepeatedTimer(self.interval, self.check_resources).start()

	def get_assets(self):
		return dict(
			js=[
				"js/filesize.min.js",
				"js/resource_monitor.js"
			],
			css=[
				"css/resource_monitor.css"
			]
		)

	def get_cpu(self):
		return dict(
			cores=psutil.cpu_percent(percpu=True),
			average=psutil.cpu_percent(),
			frequency=psutil.cpu_freq()._asdict(),
			core_count=psutil.cpu_count(logical=False),
			thread_count=psutil.cpu_count(logical=True),
			pids=len(psutil.pids())
		)

	def get_template_vars(self):
		return dict(
			partitions=self.get_partitions(all=False),
			all_partitions=self.get_partitions(all=True),
			network=self.get_network(all=False),
			all_network=self.get_network(all=True),
			cpu=self.get_cpu(),
			temp=self.get_cpu_temp(),
			battery=self.get_battery()
		)

	def get_partitions(self, all):
		partitions = [partition._asdict() for partition in psutil.disk_partitions() if partition.fstype and (all or partition.mountpoint not in self.__disk_exceptions)]
		for partition in partitions:
			partition.update(psutil.disk_usage(partition["mountpoint"])._asdict())
		return partitions

	def get_network(self, all):
		io_counters = psutil.net_io_counters(pernic=True)
		addrs = psutil.net_if_addrs()
		stats = psutil.net_if_stats()
		final = []
		for nic_name in io_counters:
			if all or nic_name not in self.__network_exceptions:
				nic = dict(
					name=nic_name,
					addrs=[addr._asdict() for addr in addrs[nic_name]]
				)
				nic.update(io_counters[nic_name]._asdict())
				nic.update(stats[nic_name]._asdict())
				final.append(nic)
		return final

	def get_cpu_temp(self):
		if hasattr(psutil, "sensors_temperatures"):
			temps = psutil.sensors_temperatures()
		else:
			temps = None
		if temps:
			if "coretemp" in temps:
				return temps["coretemp"][0]._asdict()
			if "cpu-thermal" in temps:
				return temps["cpu-thermal"][0]._asdict()
		return dict()

	def get_battery(self):
		bat = psutil.sensors_battery()
		if bat:
			return bat._asdict()
		return None

	def get_update_information(self):
		return dict(
			resource_monitor=dict(
				displayName="Resource Monitor",
				displayVersion=self._plugin_version,

				type="github_release",
				user="Renaud11232",
				repo="OctoPrint-Resource-Monitor",
				current=self._plugin_version,

				pip="https://github.com/Renaud11232/OctoPrint-Resource-Monitor/archive/{target_version}.zip"
			)
		)


__plugin_name__ = "Resource Monitor"
__plugin_pythoncompat__ = ">=2.7,<4"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = ResourceMonitorPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
