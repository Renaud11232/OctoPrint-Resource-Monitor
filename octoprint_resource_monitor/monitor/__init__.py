import os
import platform
import psutil
import time


class Monitor:

	def __init__(self, network_exceptions, disk_exceptions, diskio_exceptions, use_net_if_stats, logger):
		self.__logger = logger
		self.__init_process()
		self.__network_exceptions = network_exceptions
		self.__disk_exceptions = disk_exceptions
		self.__diskio_exceptions = diskio_exceptions
		self.__use_net_if_stats = use_net_if_stats

	def __get_cpu_temp(self, temp):
		if temp is None:
			return None
		cpu_temp = None
		temperature_possible_keys = {
			"coretemp": 1,
			"cpu-thermal": 1,
			"cpu_thermal": 1,
			"soc_thermal": 1,
			"cpu_thermal_zone": 1,
			"acpitz": 1,
			"scpi_sensors": 1,
			"k10temp": 1,
			"aml_thermal": 1000
		}
		for key, multiplier in temperature_possible_keys.items():
			if key in temp:
				cpu_temp = temp[key][0]._asdict()
				if multiplier != 1:
					for t_key in cpu_temp:
						cpu_temp[t_key] *= multiplier
				break
		return cpu_temp

	def __init_process(self):
		self.__process = psutil.Process()
		self.__logger.debug(f"self.__process is now {repr(self.__process)}")
		# First call, so it does not return 0 on next call
		self.__process.cpu_percent()

	def get_cpu(self):
		cpu_freq = psutil.cpu_freq()
		self.__logger.debug(f"cpu_freq() : {repr(cpu_freq)}")
		cores = psutil.cpu_percent(percpu=True)
		self.__logger.debug(f"cpu_percent(percpu=True) : {repr(cores)}")
		average = psutil.cpu_percent()
		self.__logger.debug(f"cpu_percent() : {repr(average)}")
		core_count = psutil.cpu_count(logical=False)
		self.__logger.debug(f"cpu_count(logical=False) : {repr(core_count)}")
		thread_count = psutil.cpu_count(logical=True)
		self.__logger.debug(f"cpu_count(logical=True) : {repr(thread_count)}")
		pids = len(psutil.pids())
		self.__logger.debug(f"len(pids()) : {repr(pids)}")
		boot_time = psutil.boot_time()
		self.__logger.debug(f"boot_time() : {repr(boot_time)}")
		return dict(
			cores=cores,
			average=average,
			frequency=cpu_freq._asdict() if cpu_freq else dict(),
			core_count=core_count,
			thread_count=thread_count,
			pids=pids,
			uptime=int(time.time() - boot_time),
			octoprint=self.__get_octoprint_cpu(average, core_count)
		)

	def __get_octoprint_cpu(self, average, core_count):
		try:
			total_cpu = self.__process.cpu_percent()
		except psutil.NoSuchProcess:
			self.__logger.debug(f"No process found when calling cpu_percent() on {repr(self.__process)}")
			self.__init_process()
			total_cpu = self.__process.cpu_percent()
		return min(total_cpu / core_count, average)

	def get_cpu_temp(self):
		# return dict(
		# 	celsius=dict(
		# 		current=20
		# 	),
		# 	fahrenheit=dict(
		# 		current=50
		# 	)
		# )
		temps_celsius = None
		temps_fahrenheit = None
		if hasattr(psutil, "sensors_temperatures"):
			temps_celsius = psutil.sensors_temperatures()
			self.__logger.debug(f"sensors_temperatures() : {repr(temps_celsius)}")
			temps_fahrenheit = psutil.sensors_temperatures(fahrenheit=True)
			self.__logger.debug(f"sensors_temperatures(fahrenheit=True) : {repr(temps_fahrenheit)}")
		temps_c = self.__get_cpu_temp(temps_celsius)
		temps_f = self.__get_cpu_temp(temps_fahrenheit)
		return dict(
			celsius=temps_c if temps_c else dict(),
			fahrenheit=temps_f if temps_f else dict()
		)

	def get_memory(self):
		virtual_memory = psutil.virtual_memory()
		self.__logger.debug(f"virtual_memory() : {repr(virtual_memory)}")
		return virtual_memory._asdict()

	def get_partitions(self, all):
		disk_partitions = psutil.disk_partitions()
		self.__logger.debug(f"disk_partitions() : {repr(disk_partitions)}")
		partitions = [partition._asdict() for partition in disk_partitions if partition.fstype and (all or partition.mountpoint not in self.__disk_exceptions)
									and partition.fstype not in ["squashfs"]]
		for partition in partitions:
			disk_usage = psutil.disk_usage(partition["mountpoint"])
			self.__logger.debug(f'disk_usage(partition["mountpoint"] : {repr(disk_partitions)}')
			partition.update(disk_usage._asdict())
		return partitions

	def get_network(self, all):
		io_counters = psutil.net_io_counters(pernic=True)
		self.__logger.debug(f"net_io_counters(pernic=True) : {repr(io_counters)}")
		addrs = psutil.net_if_addrs()
		self.__logger.debug(f"net_if_addrs() : {repr(addrs)}")
		stats = {}
		if self.__use_net_if_stats:
			stats = psutil.net_if_stats()
			self.__logger.debug(f"net_if_stats() : {repr(stats)}")
		final = []
		for nic_name in io_counters:
			if all or nic_name not in self.__network_exceptions:
				nic = dict(
					name=nic_name,
					addrs=[addr._asdict() for addr in addrs[nic_name]] if nic_name in addrs else []
				)
				nic.update(io_counters[nic_name]._asdict())
				if self.__use_net_if_stats and nic_name in stats:
					nic.update(stats[nic_name]._asdict())
				final.append(nic)
		return final

	def __get_physical_disks(self, io_counters):
		# On Linux disk_io_counters() reports partitions and virtual devices as well.
		# /sys/block/<name> exists for whole devices only, and the "device" entry inside
		# it is created by the kernel only for hardware backed ones, which rules out
		# loop, ram, zram and device mapper targets without parsing any device name.
		# Platforms without /sys/block (Windows) already report physical drives only.
		if platform.system() != "Linux":
			return list(io_counters.keys())
		return [name for name in io_counters.keys() if os.path.exists(os.path.join("/sys/block", name, "device"))]

	def get_disk_io(self, all):
		io_counters = psutil.disk_io_counters(perdisk=True)
		self.__logger.debug(f"disk_io_counters(perdisk=True) : {repr(io_counters)}")
		final = []
		for disk_name in sorted(self.__get_physical_disks(io_counters)):
			if all or disk_name not in self.__diskio_exceptions:
				disk = dict(name=disk_name)
				disk.update(io_counters[disk_name]._asdict())
				final.append(disk)
		return final

	def get_battery(self):
		# return dict(
		# 	percent=94,
		# 	secsleft=16628,
		# 	power_plugged=True
		# )
		bat = psutil.sensors_battery()
		self.__logger.debug(f"sensors_battery() : {repr(bat)}")
		if bat:
			return bat._asdict()
		return dict()

	def get_all_resources(self):
		return dict(
			cpu=self.get_cpu(),
			temp=self.get_cpu_temp(),
			memory=self.get_memory(),
			partitions=self.get_partitions(all=False),
			network=self.get_network(all=False),
			diskio=self.get_disk_io(all=False),
			battery=self.get_battery()
		)
