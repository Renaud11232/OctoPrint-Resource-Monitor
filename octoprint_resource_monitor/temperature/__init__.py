def to_fahrenheit(celsius):
	result = dict()
	for key, val in celsius.items():
		if val is not None and not isinstance(val, str):
			result[key] = val * 1.8 + 32
		else:
			result[key] = val
	return result
