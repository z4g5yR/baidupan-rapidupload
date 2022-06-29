/*
 * @Author: mengzonefire
 * @Date: 2021-10-14 16:36:56
 * @LastEditTime: 2022-02-10 10:54:09
 * @LastEditors: mengzonefire
 * @Description: 共用JS工具库
 */

const version = "0.8";
const updateUrl =
  "https://api.github.com/repos/mengzonefire/baidupan-rapidupload/releases/latest";
const releasePage =
  "https://github.com/mengzonefire/baidupan-rapidupload/releases/tag/";
const bdlinkPattern = /#bdlink=([\da-zA-Z+/=]+)/; // b64可能出现的字符: 大小写字母a-zA-Z, 数字0-9, +, /, = (=用于末尾补位)

function checkPath(path) {
  if (!path.match(/["\\\:*?<>|]/)) {
    localStorage.setItem("Blink_savePath", path);
    return true;
  }
  alert('转存路径错误, 不能含有字符\\":*?<>|, 示例: /GTA5/');
  return false;
}

function checkUpdate() {
  var d = new Date();
  var date = d.getMonth().toString() + d.getDate().toString();
  if (date === localStorage.getItem("Last_checkUpdate")) {
    lastVersion = localStorage.getItem("Last_version");
    if (lastVersion && version !== lastVersion)
      $("#version").after(
        '<p>发现新版本 <a href="' +
          releasePage +
          lastVersion +
          '" target=_blank>v' +
          lastVersion +
          "</a>, 请联系网站管理员更新</p>"
      );
    return;
  } else localStorage.setItem("Last_checkUpdate", date);
  $.ajax({
    url: updateUrl,
    type: "GET",
    dataType: "json",
    success: function (data, statusTxt) {
      localStorage.setItem("Last_version", data.tag_name.toString());
      if (statusTxt === "success" && data.tag_name !== version) {
        $("#version").after(
          '<p>发现新版本 <a href="' +
            releasePage +
            data.tag_name +
            '" target=_blank>v' +
            data.tag_name +
            "</a>, 请联系网站管理员更新</p>"
        );
      }
    },
  });
}

function openPostWindow(url, data) {
  // create form
  var tempForm = document.createElement("form");
  document.body.appendChild(tempForm);
  tempForm.method = "post";
  tempForm.target = "_blank";
  tempForm.action = url;

  // add data
  var key = Object.getOwnPropertyNames(data);
  for (var i = 0; i < key.length; i++) {
    var hideInput = document.createElement("input");
    hideInput.type = "hidden";
    hideInput.name = key[i];
    hideInput.value = data[key[i]];
    tempForm.appendChild(hideInput);
  }

  // submit
  tempForm.submit();
  document.body.removeChild(tempForm);
}

function saveFile(md5, md5s, size, path) {
  openPostWindow("https://pan.baidu.com/api/rapidupload", {
    "content-length": size,
    "content-md5": md5.toLowerCase(),
    "slice-md5": md5s.toLowerCase(),
    path: path,
  });
}

function saveFile2(md5, size, path) {
  openPostWindow("https://pan.baidu.com/rest/2.0/xpan/file?method=create", {
    size: size,
    block_list: JSON.stringify([md5.toLowerCase()]),
    path: path,
    rtype: 0,
  });
}

/**
 * @description: 从url中解析秒传链接
 */
function parseQueryLink(url) {
  var bdlinkB64 = url.match(bdlinkPattern);
  return bdlinkB64 ? bdlinkB64[1].fromBase64() : "";
}
/**
 * @description: 秒传链接解析器
 */
function DuParser() {}
DuParser.parse = function generalDuCodeParse(szUrl) {
  var r;
  if (szUrl.indexOf("bdpan") === 0) {
    r = DuParser.parseDu_v1(szUrl);
    r.ver = "PanDL";
  } else if (szUrl.indexOf("BaiduPCS-Go") === 0) {
    r = DuParser.parseDu_v2(szUrl);
    r.ver = "PCS-Go";
  } else if (szUrl.indexOf("BDLINK") === 0) {
    r = DuParser.parseDu_v3(szUrl);
    r.ver = "游侠 v1";
  } else {
    r = DuParser.parseDu_v4(szUrl);
    r.ver = "梦姬标准";
  }
  return r;
};
DuParser.parseDu_v1 = function parseDu_v1(szUrl) {
  return szUrl
    .replace(/\s*bdpan:\/\//g, " ")
    .trim()
    .split(" ")
    .map(function (z) {
      return z
        .trim()
        .fromBase64()
        .match(/([\s\S]+)\|([\d]{1,20})\|([\dA-Fa-f]{32})\|([\dA-Fa-f]{32})/);
    })
    .filter(function (z) {
      return z;
    })
    .map(function (info) {
      return {
        md5: info[3],
        md5s: info[4],
        size: info[2],
        path: info[1],
      };
    });
};
DuParser.parseDu_v2 = function parseDu_v2(szUrl) {
  return szUrl
    .split("\n")
    .map(function (z) {
      // unsigned long long: 0~18446744073709551615
      return z
        .trim()
        .match(
          /-length=([\d]{1,20}) -md5=([\dA-Fa-f]{32}) -slicemd5=([\dA-Fa-f]{32})[\s\S]+"([\s\S]+)"/
        );
    })
    .filter(function (z) {
      return z;
    })
    .map(function (info) {
      return {
        md5: info[2],
        md5s: info[3],
        size: info[1],
        path: info[4],
      };
    });
};
DuParser.parseDu_v3 = function parseDu_v3(szUrl) {
  var raw = atob(szUrl.slice(6).replace(/\s/g, ""));
  if (raw.slice(0, 5) !== "BDFS\x00") {
    return null;
  }
  var buf = new SimpleBuffer(raw);
  var ptr = 9;
  var arrFiles = [];
  var fileInfo, nameSize;
  var total = buf.readUInt(5);
  var i;
  for (i = 0; i < total; i++) {
    // 大小 (8 bytes)
    // MD5 + MD5S (0x20)
    // nameSize (4 bytes)
    // Name (unicode)
    fileInfo = {};
    fileInfo.size = buf.readULong(ptr + 0);
    fileInfo.md5 = buf.readHex(ptr + 8, 0x10);
    fileInfo.md5s = buf.readHex(ptr + 0x18, 0x10);
    nameSize = buf.readUInt(ptr + 0x28) << 1;
    fileInfo.nameSize = nameSize;
    ptr += 0x2c;
    fileInfo.path = buf.readUnicode(ptr, nameSize);
    arrFiles.push(fileInfo);
    ptr += nameSize;
  }
  return arrFiles;
};
DuParser.parseDu_v4 = function parseDu_v3(szUrl) {
  return szUrl
    .split("\n")
    .map(function (z) {
      return z
        .trim()
        .match(
          /^([\dA-Fa-f]{32})#(?:([\dA-Fa-f]{32})#)?([\d]{1,20})#([\s\S]+)/
        );
    })
    .filter(function (z) {
      return z;
    })
    .map(function (info) {
      return {
        // 标准码 / 短版标准码(无md5s)
        md5: info[1],
        md5s: info[2] || "",
        size: info[3],
        path: info[4],
      };
    });
};

/**
 * 一个简单的类似于 NodeJS Buffer 的实现.
 * 用于解析游侠度娘提取码。
 * @param {SimpleBuffer}
 */
function SimpleBuffer(str) {
  this.fromString(str);
}
SimpleBuffer.toStdHex = function toStdHex(n) {
  return ("0" + n.toString(16)).slice(-2);
};
SimpleBuffer.prototype.fromString = function fromString(str) {
  var len = str.length;
  this.buf = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    this.buf[i] = str.charCodeAt(i);
  }
};
SimpleBuffer.prototype.readUnicode = function readUnicode(index, size) {
  if (size & 1) {
    size++;
  }
  var bufText = Array.prototype.slice
    .call(this.buf, index, index + size)
    .map(SimpleBuffer.toStdHex);
  var buf = [""];
  for (var i = 0; i < size; i += 2) {
    buf.push(bufText[i + 1] + bufText[i]);
  }
  return JSON.parse('"' + buf.join("\\u") + '"');
};
SimpleBuffer.prototype.readNumber = function readNumber(index, size) {
  var ret = 0;
  for (var i = index + size; i > index; ) {
    ret = this.buf[--i] + ret * 256;
  }
  return ret;
};
SimpleBuffer.prototype.readUInt = function readUInt(index) {
  return this.readNumber(index, 4);
};
SimpleBuffer.prototype.readULong = function readULong(index) {
  return this.readNumber(index, 8);
};
SimpleBuffer.prototype.readHex = function readHex(index, size) {
  return Array.prototype.slice
    .call(this.buf, index, index + size)
    .map(SimpleBuffer.toStdHex)
    .join("");
};
