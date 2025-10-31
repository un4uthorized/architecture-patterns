print('Starting replica set initialization...');

try {
  var status;
  try {
    status = rs.status();
    if (status.ok === 1) {
      print('Replica set already initialized. Current status:');
      printjson(status);
      quit(0);
    }
  } catch (e) {
    print('Replica set not initialized yet. Proceeding with initialization...');
  }

  var config = {
    _id: 'rs0',
    members: [
      {
        _id: 0,
        host: 'localhost:27017',
        priority: 1
      }
    ]
  };

  print('Initializing replica set with config:');
  printjson(config);
  
  var result = rs.initiate(config);
  print('Initialization result:');
  printjson(result);

  if (result.ok === 1) {
    print('✅ Replica set initialized successfully!');
    
    print('Waiting for replica set to be ready...');
    var maxAttempts = 30;
    var attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        var currentStatus = rs.status();
        if (currentStatus.members && currentStatus.members[0] && currentStatus.members[0].state === 1) {
          print('✅ Replica set is ready and PRIMARY!');
          printjson(currentStatus);
          break;
        } else {
          print('Waiting... Current state: ' + (currentStatus.members ? currentStatus.members[0].state : 'unknown'));
          sleep(1000);
        }
      } catch (e) {
        print('Still waiting for replica set... Attempt ' + (attempts + 1) + '/' + maxAttempts);
        sleep(1000);
      }
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      print('⚠️  Warning: Replica set initialization may not be complete, but it should work.');
    }
    
  } else {
    print('❌ Failed to initialize replica set:');
    printjson(result);
    quit(1);
  }

} catch (error) {
  print('❌ Error during replica set initialization:');
  print(error);
  quit(1);
}

print('🎉 Replica set setup completed successfully!');