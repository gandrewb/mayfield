<?php
	
require_once('stripe/vendor/autoload.php');
require_once('stripe_config.php');

\Stripe\Stripe::setApiKey($stripe['secret_key']);

$token  = $_GET['token'];
$amount = $_GET['amount'];
$email =  $_GET['email'];

$customer = \Stripe\Customer::create(array(
	'email' => $email,
	'source'  => $token
));

try {
	$charge = \Stripe\Charge::create(array(
		'customer' => $customer->id,
		'amount'   => $amount,
		'currency' => 'usd'
	));
} catch(\Stripe\Error\Card $e) {
 	echo 'failure';
}

echo 'success';
?>