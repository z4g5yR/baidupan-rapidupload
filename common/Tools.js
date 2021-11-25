/*
 * @Author: mengzonefire
 * @Date: 2021-10-14 16:36:56
 * @LastEditTime: 2021-11-25 20:21:00
 * @LastEditors: mengzonefire
 * @Description:
 */
var version = "0.5";
var updateUrl =
  "https://api.github.com/repos/mengzonefire/baidupan-rapidupload/releases/latest";
var releasePage =
  "https://github.com/mengzonefire/baidupan-rapidupload/releases/tag/";

function checkBdstoken(bdstoken) {
  if (/^[\da-z]{32}$/.test(bdstoken)) {
    localStorage.setItem("Blink_bdstoken", bdstoken);
    return true;
  }
  alert("bdstoken错误, 正确格式为32位字母数字组合");
  return false;
}

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

function saveFile(md5, md5s, size, path, bdstoken) {
  openPostWindow("https://pan.baidu.com/api/rapidupload?bdstoken=" + bdstoken, {
    "content-length": size,
    "content-md5": md5.toLowerCase(),
    "slice-md5": md5s.toLowerCase(),
    path: path,
  });
}

function saveFile2(md5, size, path, bdstoken) {
  openPostWindow(
    "https://pan.baidu.com/rest/2.0/xpan/file?method=create&bdstoken=" +
      bdstoken,
    {
      size: size,
      block_list: JSON.stringify([md5.toLowerCase()]),
      path: path,
      rtype: 0,
    }
  );
}

function DuParser() {}

DuParser.parse = function generalDuCodeParse(szUrl) {
  var r;
  if (szUrl.indexOf("bdpan") === 0) {
    r = DuParser.parseDu_v1(szUrl);
    r.ver = "PanDL";
  } else if (szUrl.indexOf("BaiduPCS-Go") === 0) {
    r = DuParser.parseDu_v2(szUrl);
    r.ver = "PCS-Go";
  } else {
    r = DuParser.parseDu_v3(szUrl);
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
