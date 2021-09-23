module.exports = (text, err = false) => {
	let date_ob = new Date();
	let date = ("0" + date_ob.getDate()).slice(-2);
	let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
	let year = date_ob.getFullYear();
	let hours = date_ob.getHours().toString().padStart(2, '0');
	let minutes = date_ob.getMinutes().toString().padStart(2, '0');
	let seconds = date_ob.getSeconds().toString().padStart(2, '0');
	let dateDisplay = `${year}/${month}/${date} - ${hours}:${minutes}:${seconds}`;
	let color = err ? "\x1b[31m" : "";
	console.log(`${color}[${dateDisplay}] ${text}\x1b[0m`);
};
