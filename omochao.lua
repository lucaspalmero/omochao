local function printchat(p, text)
	 chatprint("\x84" .. text .. "\x80");
end
COM_AddCommand("printchat", printchat)

local function heartbeat(p)
	print("[heartbeat]")
end
COM_AddCommand("heartbeat", heartbeat, COM_LOCAL)
