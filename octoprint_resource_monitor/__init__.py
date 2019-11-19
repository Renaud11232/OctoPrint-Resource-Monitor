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
			# put your plugin's default settings here
		)

	def interval(self):
		return 1

	def check_resources(self):

		message = dict(
			cpu=self.get_cpu(),
			memory=psutil.virtual_memory()._asdict(),
			partitions=self.get_partitions(),
			network=self.get_network()

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
			frequency=psutil.cpu_freq()._asdict()
		)
	def get_template_vars(self):
		return dict(
			partitions=self.get_partitions(),
			network=self.get_network(),
			cpu=self.get_cpu()
		)

	def get_partitions(self):
		partitions = [partition._asdict() for partition in psutil.disk_partitions() if partition.fstype]
		for partition in partitions:
			partition.update(psutil.disk_usage(partition["mountpoint"])._asdict())
		return partitions

	def get_network(self):
		io_counters = psutil.net_io_counters(pernic=True)
		addrs = psutil.net_if_addrs()
		stats = psutil.net_if_stats()
		final = []
		for nic_name in io_counters:
			nic = dict(
				name=nic_name,
				addrs=[addr._asdict() for addr in addrs[nic_name]]
			)
			nic.update(io_counters[nic_name]._asdict())
			nic.update(stats[nic_name]._asdict())
			final.append(nic)
		return final

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


def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = ResourceMonitorPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
