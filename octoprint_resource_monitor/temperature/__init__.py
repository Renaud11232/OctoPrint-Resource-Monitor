def to_fahrenheit(celsius):
	return {key: val * 1.8 + 32 for key, val in celsius.items()}
