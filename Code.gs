const PIN = '2729';
const PROP = 'AM_DIGITAL_ACCOUNTS_DATA_V2';

function doGet(e) {
  if ((e.parameter.action || 'get') !== 'get') return json_({ok:false,error:'Unknown action'});
  const data = read_();
  return json_({ok:true,data:data});
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    if (req.pin !== PIN) return json_({ok:false,error:'Incorrect PIN'});
    if (req.action === 'publish') {
      validate_(req.data);
      write_(req.data);
      return json_({ok:true,data:read_()});
    }
    if (req.action === 'reset') {
      const data = original_();
      write_(data);
      return json_({ok:true,data:data});
    }
    return json_({ok:false,error:'Unknown action'});
  } catch (err) {
    return json_({ok:false,error:String(err)});
  }
}

function read_() {
  const raw = PropertiesService.getScriptProperties().getProperty(PROP);
  return raw ? JSON.parse(raw) : original_();
}

function write_(data) {
  PropertiesService.getScriptProperties().setProperty(PROP, JSON.stringify(data));
}

function validate_(d) {
  if (!d || !Array.isArray(d.rows) || d.rows.length !== 31) throw new Error('Invalid sheet data');
  if (!('deposit' in d)) throw new Error('Missing deposit');
}

function original_() {
  return {month:'',rows:[
    [1,'Chai',40,'Mausi',1],[2,'Chai',20,'Muma',1],[3,'Chai',40,'Mausi',1],[4,'Chai',80,'Mausi',2],[5,'Chai',40,'Mausi',1],[6,'Poha',60,'Mausi',1],[7,'Chai',40,'Mausi',1],[8,'Chai',40,'Mausi',1],
    [9,'','','',''],[10,'','','',''],[11,'','','',''],[12,'','','',''],[13,'','','',''],[14,'','','',''],[15,'','','',''],[16,'','','',''],[17,'','','',''],[18,'','','',''],[19,'','','',''],[20,'','','',''],[21,'','','',''],[22,'','','',''],[23,'','','',''],[24,'','','',''],[25,'','','',''],[26,'','','',''],[27,'','','',''],[28,'','','',''],[29,'','','',''],[30,'','','',''],[31,'','','','']
  ],deposit:1000};
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
